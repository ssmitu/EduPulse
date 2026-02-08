using EduPulse.API.Data;
using EduPulse.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GradesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public GradesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // --- METHOD 1: TEACHER UPDATES GRADES (Bulk Action) ---
        [HttpPost("bulk-update")]
        public async Task<IActionResult> BulkUpdateGrades([FromBody] List<Grade> grades)
        {
            foreach (var grade in grades)
            {
                var existing = await _context.Grades
                    .FirstOrDefaultAsync(g => g.AssessmentId == grade.AssessmentId && g.StudentId == grade.StudentId);

                if (existing != null)
                {
                    existing.MarksObtained = grade.MarksObtained;
                }
                else
                {
                    _context.Grades.Add(grade);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Grades updated successfully" });
        }

        // --- METHOD 2: STUDENT VIEWS THEIR OWN RESULT (Updated with EnrollmentId) ---
        [HttpGet("student/{courseId}")]
        public async Task<IActionResult> GetMyCourseGrades(int courseId)
        {
            // 1. Get the logged-in student's ID from the JWT Token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int studentId = int.Parse(userIdClaim.Value);

            // 2. Find the Enrollment record for this student and course
            // This is CRUCIAL for linking to Soft Skills
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

            if (enrollment == null) return NotFound("Student is not enrolled in this course.");

            // 3. Get the Course Details
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course == null) return NotFound("Course not found");

            // 4. Get all Assessments for this course
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            // 5. Get ONLY this student's grades
            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            // 6. Return the combined data including enrollmentId
            return Ok(new
            {
                enrollmentId = enrollment.Id, // <--- ADDED THIS LINE
                CourseTitle = course.Title,
                CourseCode = course.Code,
                Policy = course.GradingPolicy,
                Assessments = assessments,
                Grades = grades
            });
        }
    }
}