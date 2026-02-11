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
            // 1. Get Assessments
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
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

            // 4. Calculate Attendance Automatically
            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == 0); // Assuming 0 is Attendance in your Enum

            if (attendanceAssessment != null)
            {
                foreach (var enrollment in enrollments)
                {
                    try
                    {
                        // Calculate stats using the service
                        var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, enrollment.StudentId);

                        // Find existing grade in memory (from the list we just fetched)
                        var studentAttendanceGrade = grades.FirstOrDefault(g =>
                            g.AssessmentId == attendanceAssessment.Id &&
                            g.StudentId == enrollment.StudentId);

                        if (studentAttendanceGrade != null)
                        {
                            // Update the in-memory value (for display only, not saving to DB here)
                            studentAttendanceGrade.MarksObtained = summary.GradePoints;
                        }
                        else
                        {
                            // Add a virtual grade for display
                            grades.Add(new Grade
                            {
                                AssessmentId = attendanceAssessment.Id,
                                StudentId = enrollment.StudentId,
                                MarksObtained = summary.GradePoints
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error calculating attendance for student {enrollment.StudentId}: {ex.Message}");
                        // Continue loop so one failure doesn't break the whole gradebook
                    }
                }
            }

            // 5. Return JSON
            return Ok(new
            {
                Assessments = assessments,
                Grades = grades,
                // ✅ FIX: Explicitly naming properties so Frontend .map(s => s.name) works
                Students = enrollments.Select(e => new
                {
                    StudentId = e.StudentId,
                    Name = e.Student != null ? e.Student.Name : "Unknown Student"
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
                {
                    existing.MarksObtained = grade.MarksObtained;
                }
                else
                {
                    // Ensure we are not inserting with ID if it's auto-generated
                    grade.Id = 0;
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

            if (!int.TryParse(userIdClaim.Value, out int studentId))
            {
                return BadRequest("Invalid User ID in token.");
            }

            // 1. Get Course Details
            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            if (course == null) return NotFound("Course not found");

            // 2. Find Enrollment
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

            if (enrollment == null) return NotFound("Student is not enrolled in this course.");

            // 3. Get Assessments and Grades
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .AsNoTracking()
                .ToListAsync();

            var assessmentIds = assessments.Select(a => a.Id).ToList();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessmentIds.Contains(g.AssessmentId))
                .AsNoTracking()
                .ToListAsync();

            // 4. Handle LIVE Attendance Grade
            var attendanceAssessment = assessments.FirstOrDefault(a => a.Type == 0); // 0 = Attendance
            if (attendanceAssessment != null)
            {
                try
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
                catch (Exception ex)
                {
                    Console.WriteLine($"Error calculating student attendance: {ex.Message}");
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

        // GET: api/Grades/gap-analysis/{courseId}
        // GET: api/Grades/gap-analysis/{courseId}
        // GET: api/Grades/gap-analysis/{courseId}
        // GET: api/Grades/gap-analysis/{courseId}
        [HttpGet("gap-analysis/{courseId}")]
        public async Task<IActionResult> GetGapAnalysis(int courseId)
        {
            // 1. Get logged-in student ID
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int studentId = int.Parse(userIdClaim.Value);

            // 2. Fetch all assessments for this course
            var assessments = await _context.Assessments
                .Where(a => a.CourseId == courseId)
                .ToListAsync();

            // 3. Fetch all Student IDs enrolled in this course (THIS WAS MISSING IN YOUR CODE)
            var allStudentIds = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Select(e => e.StudentId)
                .ToListAsync();

            var analysis = new List<GapAnalysisDto>();

            foreach (var a in assessments)
            {
                double myMark = 0;
                double classAvgMark = 0;

                if (a.Type == 0) // Attendance Type
                {
                    // Get My Live Attendance
                    var myAttd = await _attendanceService.CalculateStudentAttendanceAsync(courseId, studentId);
                    myMark = myAttd.GradePoints;

                    // Calculate Class Average Attendance
                    double totalAttendancePoints = 0;
                    foreach (var id in allStudentIds)
                    {
                        var summary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, id);
                        totalAttendancePoints += summary.GradePoints;
                    }
                    classAvgMark = allStudentIds.Count > 0 ? totalAttendancePoints / allStudentIds.Count : 0;
                }
                else // Quiz / Exam Type
                {
                    // Get My Mark
                    myMark = await _context.Grades
                        .Where(g => g.AssessmentId == a.Id && g.StudentId == studentId)
                        .Select(g => (double?)g.MarksObtained).FirstOrDefaultAsync() ?? 0;

                    // Get Class Average Mark
                    // Get Class Average Mark
                    classAvgMark = await _context.Grades
                        .Where(g => g.AssessmentId == a.Id)
                        .AverageAsync(g => (double?)g.MarksObtained) ?? 0;
                }

                analysis.Add(new GapAnalysisDto
                {
                    AssessmentTitle = a.Title,
                    MyPercentage = a.MaxMarks > 0 ? (myMark / (double)a.MaxMarks) * 100 : 0,
                    ClassAveragePercentage = a.MaxMarks > 0 ? (classAvgMark / (double)a.MaxMarks) * 100 : 0
                });
            }

            return Ok(analysis);
        }
    }
}