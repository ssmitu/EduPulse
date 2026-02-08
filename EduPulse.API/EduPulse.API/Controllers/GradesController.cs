using EduPulse.API.Data;
using EduPulse.API.Models;
using EduPulse.API.Services;
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
        private readonly IAttendanceService _attendanceService;

        public GradesController(ApplicationDbContext context, IAttendanceService attendanceService)
        {
            _context = context;
            _attendanceService = attendanceService;
        }

        // --- METHOD 1: TEACHER VIEWS THE WHOLE GRADEBOOK (The Missing Piece) ---
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetCourseGradebook(int courseId)
        {
            // 1. Get all assessments for this course
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            // 2. Get all enrolled students
            var enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .ToListAsync();

            // 3. Get all existing grades
            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            // Find which assessment is the "Attendance" type
            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == AssessmentType.Attendance);

            // =========================================================
            // ✅ LIVE OVERRIDE FOR ALL STUDENTS
            // =========================================================
            if (attendanceAssessment != null)
            {
                foreach (var enrollment in enrollments)
                {
                    // Calculate live score for this specific student
                    var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, enrollment.StudentId);

                    // Find their attendance grade in our list
                    var studentAttendanceGrade = grades.FirstOrDefault(g =>
                        g.AssessmentId == attendanceAssessment.Id &&
                        g.StudentId == enrollment.StudentId);

                    if (studentAttendanceGrade != null)
                    {
                        // Update the list value before sending to UI
                        studentAttendanceGrade.MarksObtained = summary.GradePoints;
                    }
                    else
                    {
                        // If no grade exists in DB, add a "Virtual Grade" to the list for the UI
                        grades.Add(new Grade
                        {
                            AssessmentId = attendanceAssessment.Id,
                            StudentId = enrollment.StudentId,
                            MarksObtained = summary.GradePoints
                        });
                    }
                }
            }
            // =========================================================

            return Ok(new
            {
                Assessments = assessments,
                Grades = grades,
                Students = enrollments.Select(e => new { e.StudentId, e.Student?.Name })
            });
        }

        // --- METHOD 2: TEACHER UPDATES GRADES (Bulk Action) ---
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

        // --- METHOD 3: STUDENT VIEWS THEIR OWN RESULT ---
        [HttpGet("student/{courseId}")]
        public async Task<IActionResult> GetMyCourseGrades(int courseId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int studentId = int.Parse(userIdClaim.Value);

            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Course not found");

            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == AssessmentType.Attendance);

            if (attendanceAssessment != null)
            {
                var attendanceSummary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, studentId);
                var attendanceGrade = grades.FirstOrDefault(g => g.AssessmentId == attendanceAssessment.Id);

                if (attendanceGrade != null)
                {
                    attendanceGrade.MarksObtained = attendanceSummary.GradePoints;
                }
                else
                {
                    grades.Add(new Grade
                    {
                        AssessmentId = attendanceAssessment.Id,
                        StudentId = studentId,
                        MarksObtained = attendanceSummary.GradePoints
                    });
                }
            }

            return Ok(new
            {
                CourseTitle = course.Title,
                CourseCode = course.Code,
                Policy = course.GradingPolicy,
                Assessments = assessments,
                Grades = grades
            });
        }
    }
}