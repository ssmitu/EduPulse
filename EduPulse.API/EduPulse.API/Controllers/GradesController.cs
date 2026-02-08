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

        // --- METHOD 1: TEACHER VIEWS THE WHOLE GRADEBOOK ---
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetCourseGradebook(int courseId)
        {
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            var enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == AssessmentType.Attendance);

            // LIVE OVERRIDE FOR ATTENDANCE
            if (attendanceAssessment != null)
            {
                foreach (var enrollment in enrollments)
                {
                    var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, enrollment.StudentId);
                    var studentAttendanceGrade = grades.FirstOrDefault(g =>
                        g.AssessmentId == attendanceAssessment.Id &&
                        g.StudentId == enrollment.StudentId);

                    if (studentAttendanceGrade != null)
                    {
                        studentAttendanceGrade.MarksObtained = summary.GradePoints;
                    }
                    else
                    {
                        grades.Add(new Grade
                        {
                            AssessmentId = attendanceAssessment.Id,
                            StudentId = enrollment.StudentId,
                            MarksObtained = summary.GradePoints
                        });
                    }
                }
            }

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

        // --- METHOD 3: STUDENT VIEWS THEIR OWN RESULT (Attendance + Soft Skills) ---
        [HttpGet("student/{courseId}")]
        public async Task<IActionResult> GetMyCourseGrades(int courseId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int studentId = int.Parse(userIdClaim.Value);

            // 1. Get Course Details
            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Course not found");

            // 2. Find Enrollment (Crucial for teammate's Soft Skills UI)
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

            if (enrollment == null) return NotFound("Student is not enrolled in this course.");

            // 3. Get Assessments and Grades
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            // 4. Handle LIVE Attendance Grade
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

            // 5. Final Combined Result
            return Ok(new
            {
                CourseTitle = course.Title,
                CourseCode = course.Code,
                Policy = course.GradingPolicy,
                EnrollmentId = enrollment.Id, // <--- Link for Soft Skills
                Assessments = assessments,
                Grades = grades
            });
        }
    }
}