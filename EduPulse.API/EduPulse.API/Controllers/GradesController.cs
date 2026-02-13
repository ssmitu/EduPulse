using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using EduPulse.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            // 1. Get Assessments (Ordered by Date for the Spreadsheet Columns)
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Date)
                .AsNoTracking()
                .ToListAsync();

            // 2. Get Enrollments (Students)
            var enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .AsNoTracking()
                .ToListAsync();

            // 3. Get Grades for these assessments
            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => assessmentIds.Contains(g.AssessmentId))
                .ToListAsync();

            // 4. Inject LIVE Attendance Calculation
            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == AssessmentType.Attendance);

            if (attendanceAssessment != null)
            {
                foreach (var enrollment in enrollments)
                {
                    try
                    {
                        var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, enrollment.StudentId);
                        var existingGrade = grades.FirstOrDefault(g =>
                            g.AssessmentId == attendanceAssessment.Id &&
                            g.StudentId == enrollment.StudentId);

                        if (existingGrade != null)
                            existingGrade.MarksObtained = summary.GradePoints;
                        else
                            grades.Add(new Grade { AssessmentId = attendanceAssessment.Id, StudentId = enrollment.StudentId, MarksObtained = summary.GradePoints });
                    }
                    catch { /* Continue if one student fails */ }
                }
            }

            return Ok(new
            {
                Assessments = assessments,
                Grades = grades,
                Students = enrollments.Select(e => new
                {
                    StudentId = e.StudentId,
                    Name = e.Student != null ? e.Student.Name : "Unknown"
                })
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
                    existing.MarksObtained = grade.MarksObtained;
                else
                {
                    grade.Id = 0;
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

            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

            if (enrollment == null) return NotFound("Student not enrolled.");

            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Date)
                .AsNoTracking()
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessmentIds.Contains(g.AssessmentId))
                .AsNoTracking()
                .ToListAsync();

            // Inject Live Attendance
            var attAssessment = assessments.FirstOrDefault(a => a.Type == AssessmentType.Attendance);
            if (attAssessment != null)
            {
                var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, studentId);
                var attGrade = grades.FirstOrDefault(g => g.AssessmentId == attAssessment.Id);
                if (attGrade != null) attGrade.MarksObtained = summary.GradePoints;
                else grades.Add(new Grade { AssessmentId = attAssessment.Id, StudentId = studentId, MarksObtained = summary.GradePoints });
            }

            return Ok(new
            {
                CourseTitle = course.Title,
                CourseCode = course.Code,
                Policy = course.GradingPolicy,
                EnrollmentId = enrollment.Id,
                Assessments = assessments,
                Grades = grades
            });
        }

        // --- METHOD 4: PEER GAP ANALYSIS (The Comparison Chart) ---
        [HttpGet("gap-analysis/{courseId}")]
        public async Task<IActionResult> GetGapAnalysis(int courseId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int studentId = int.Parse(userIdClaim.Value);

            // 1. Get assessments in chronological order
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Date)
                .ToListAsync();

            var enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .ToListAsync();

            var result = new List<GapAnalysisDto>();

            foreach (var a in assessments)
            {
                double myMark = 0;
                double classSum = 0;
                int count = 0;

                try
                {
                    if (a.Type == AssessmentType.Attendance)
                    {
                        // Current User
                        var myAttd = await _attendanceService.CalculateStudentAttendanceAsync(courseId, studentId);
                        myMark = myAttd.GradePoints;

                        // Class Total
                        foreach (var e in enrollments)
                        {
                            var sum = await _attendanceService.CalculateStudentAttendanceAsync(courseId, e.StudentId);
                            classSum += sum.GradePoints;
                            count++;
                        }
                    }
                    else
                    {
                        // Current User
                        myMark = await _context.Grades
                            .Where(g => g.AssessmentId == a.Id && g.StudentId == studentId)
                            .Select(g => g.MarksObtained).FirstOrDefaultAsync();

                        // Class Total
                        var allGrades = await _context.Grades
                            .Where(g => g.AssessmentId == a.Id)
                            .Select(g => g.MarksObtained).ToListAsync();

                        classSum = allGrades.Sum();
                        count = allGrades.Count;
                    }

                    result.Add(new GapAnalysisDto
                    {
                        AssessmentTitle = a.Title,
                        MyPercentage = a.MaxMarks > 0 ? Math.Round((myMark / a.MaxMarks) * 100, 1) : 0,
                        ClassAveragePercentage = (a.MaxMarks > 0 && count > 0)
                            ? Math.Round(((classSum / count) / a.MaxMarks) * 100, 1) : 0
                    });
                }
                catch { /* Skip errors for single assessment to prevent breaking chart */ }
            }

            return Ok(result);
        }
    }
}