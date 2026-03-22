using EduPulse.API.Data;
using EduPulse.API.Models;
using EduPulse.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PromotionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly PromotionService _promotionService;

        public PromotionController(ApplicationDbContext context, PromotionService promotionService)
        {
            _context = context;
            _promotionService = promotionService;
        }

        [HttpGet("batch-status")]
        public async Task<IActionResult> GetBatchStatus(int departmentId, int semester)
        {
            // 1. Get all students in this Dept and Semester
            var students = await _context.Users
                .Where(u => u.DepartmentId == departmentId &&
                            u.CurrentSemester == semester &&
                            (int)u.Role == 2)
                .ToListAsync();

            var batchSummary = new List<object>();

            foreach (var student in students)
            {
                // 2. GET ALL ENROLLMENTS (Live Check)
                // This includes current semester courses AND any past carries they are still enrolled in
                var allEnrollments = await _context.Enrollments
                    .Include(e => e.Course)
                    .Where(e => e.StudentId == student.Id)
                    .ToListAsync();

                int currentSemesterFails = 0;
                int totalActiveCarry = 0;
                var courseDetails = new List<object>();

                foreach (var enrollment in allEnrollments)
                {
                    // Check if this course is already finalized as a "PASS" in the database
                    var existingPass = await _context.CourseResults
                        .AnyAsync(cr => cr.EnrollmentId == enrollment.Id && cr.IsPassed);

                    if (existingPass) continue; // If they passed it before, it's not a carry anymore.

                    // If not passed before, calculate the LIVE result from the Gradebook
                    var liveResult = await _promotionService.CalculateCourseResult(enrollment.Id);

                    if (!liveResult.IsPassed)
                    {
                        totalActiveCarry++;

                        // If the fail is in the semester we are currently reviewing
                        if (enrollment.Course.TargetSemester == semester)
                        {
                            currentSemesterFails++;
                            courseDetails.Add(new
                            {
                                CourseName = enrollment.Course.Title,
                                TotalMarks = liveResult.TotalMarks,
                                Status = "Fail"
                            });
                        }
                    }
                    else if (enrollment.Course.TargetSemester == semester)
                    {
                        // Student passed a course in the current semester
                        courseDetails.Add(new
                        {
                            CourseName = enrollment.Course.Title,
                            TotalMarks = liveResult.TotalMarks,
                            Status = "Pass"
                        });
                    }
                }

                batchSummary.Add(new
                {
                    StudentId = student.Id,
                    StudentName = student.Name,
                    Courses = courseDetails,
                    CurrentFails = currentSemesterFails,
                    TotalActiveCarry = totalActiveCarry,
                    EligibleForPromotion = totalActiveCarry <= 2,
                    Action = totalActiveCarry <= 2 ? "Promote" : "Semester Drop"
                });
            }

            return Ok(batchSummary);
        }

        [HttpPost("publish-results")]
        public async Task<IActionResult> PublishResults(int departmentId, int semester)
        {
            var students = await _context.Users
                .Where(u => u.DepartmentId == departmentId &&
                            u.CurrentSemester == semester &&
                            (int)u.Role == 2)
                .ToListAsync();

            if (!students.Any()) return BadRequest("No students found in this batch.");

            foreach (var student in students)
            {
                // Get all enrollments that aren't already marked as passed in the DB
                var activeEnrollments = await _context.Enrollments
                    .Include(e => e.Course)
                    .Where(e => e.StudentId == student.Id)
                    .ToListAsync();

                int totalFails = 0;

                foreach (var enrollment in activeEnrollments)
                {
                    // Check if already passed in history
                    var alreadyPassed = await _context.CourseResults
                        .AnyAsync(cr => cr.EnrollmentId == enrollment.Id && cr.IsPassed);

                    if (alreadyPassed) continue;

                    var result = await _promotionService.CalculateCourseResult(enrollment.Id);

                    // 1. CLEAN UP OLD RECORDS: 
                    // Set all previous results for THIS specific enrollment to NOT active carry
                    var oldResults = await _context.CourseResults
                        .Where(cr => cr.EnrollmentId == enrollment.Id)
                        .ToListAsync();
                    foreach (var old in oldResults) old.IsActiveCarryCourse = false;

                    // 2. SAVE NEW SNAPSHOT
                    _context.CourseResults.Add(result);

                    if (!result.IsPassed) totalFails++;
                }

                // 3. PROMOTION LOGIC
                if (totalFails <= 2)
                {
                    student.CurrentSemester += 1;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Batch promotion completed for {students.Count} students." });
        }
    }
}