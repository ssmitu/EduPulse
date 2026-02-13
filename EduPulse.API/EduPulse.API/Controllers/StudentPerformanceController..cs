using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using EduPulse.API.Services;

namespace EduPulse.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudentPerformanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAttendanceService _attendanceService;

        public StudentPerformanceController(ApplicationDbContext context, IAttendanceService attendanceService)
        {
            _context = context;
            _attendanceService = attendanceService;
        }

        [HttpGet("dashboard/{studentId}/{courseId}")]
        public async Task<IActionResult> GetStudentDashboard(int studentId, int courseId)
        {
            // 1. Fetch Basic Data
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.CourseId == courseId);

            if (enrollment == null) return NotFound("Student not enrolled.");

            var assessments = await _context.Assessments.Where(a => a.CourseId == courseId).ToListAsync();
            var grades = await _context.Grades
                .Where(g => g.StudentId == studentId && assessments.Select(a => a.Id).Contains(g.AssessmentId))
                .ToListAsync();

            var softSkillHistory = await _context.SoftSkills
                .Where(s => s.EnrollmentId == enrollment.Id)
                .OrderBy(s => s.LastUpdated)
                .ToListAsync();

            // 2. Attendance Calculation (Live Service)
            var attendanceSummary = await _attendanceService.CalculateStudentAttendanceAsync(courseId, studentId);
            double liveAttendancePoints = attendanceSummary.GradePoints;

            // --- HEALTH BAR LOGIC (Academic Health Status) ---
            var quizGrades = grades
                .Where(g => assessments.Any(a => a.Id == g.AssessmentId && a.Type == AssessmentType.Quiz))
                .OrderByDescending(g => g.MarksObtained).Take(2).ToList();

            double weightedQuizzes = quizGrades.Any() ? quizGrades.Average(g => (double)g.MarksObtained) : 0;
            var finalExam = assessments.FirstOrDefault(a => a.Type == AssessmentType.FinalExam);
            var finalGrade = grades.FirstOrDefault(g => g.AssessmentId == finalExam?.Id);
            double weightedFinal = finalGrade != null ? (double)finalGrade.MarksObtained : 0;

            double currentPct = Math.Round(Math.Min(liveAttendancePoints + weightedQuizzes + weightedFinal, 100), 1);

            // --- 3. BUILD TIMELINE (The Graph Data) ---
            var timeline = new List<PerformanceTimelinePoint>();

            // --- A. Add Gradebook Events (Attendance & Exams) ---
            foreach (var ass in assessments)
            {
                double? pct = null;
                if (ass.Type == AssessmentType.Attendance)
                {
                    pct = ass.MaxMarks > 0 ? Math.Round((liveAttendancePoints / ass.MaxMarks) * 100, 1) : 0;
                }
                else
                {
                    var grade = grades.FirstOrDefault(g => g.AssessmentId == ass.Id);
                    if (grade != null && ass.MaxMarks > 0)
                        pct = Math.Round(((double)grade.MarksObtained / ass.MaxMarks) * 100, 1);
                }

                timeline.Add(new PerformanceTimelinePoint
                {
                    EventName = ass.Title,
                    Date = ass.Date.Date, // Use Date part only for stable sorting
                    GradePercentage = pct,
                    SoftSkillRating = null
                });
            }

            // --- B. Add Weekly Soft Skill Reviews ---
            if (softSkillHistory.Any())
            {
                // Logic: Group reviews by week and "snap" them to the end of that week (Friday)
                // This makes the graph consistent for every student in the course.
                var weeklyGroups = softSkillHistory.GroupBy(s => {
                    DateTime d = s.LastUpdated.Date;
                    int diff = (int)DayOfWeek.Friday - (int)d.DayOfWeek;
                    if (diff < -1) diff += 7; // If recorded on Sat/Sun, snap to next Friday
                    return d.AddDays(diff).Date;
                });

                int weekCount = 1;
                foreach (var group in weeklyGroups.OrderBy(g => g.Key))
                {
                    double avg = group.Average(s => (s.Discipline + s.Participation + s.Collaboration) / 3.0);
                    timeline.Add(new PerformanceTimelinePoint
                    {
                        EventName = $"Week {weekCount} Review",
                        Date = group.Key,
                        GradePercentage = null,
                        SoftSkillRating = Math.Round(avg, 1)
                    });
                    weekCount++;
                }
            }

            // --- 4. STABLE SORTING & DATA CONTINUITY ---
            // Fix: Sort by Date, then ensure Grades (Blue Line) appear before Reviews (Orange Line) on the same day.
            timeline = timeline
                .OrderBy(t => t.Date)
                .ThenBy(t => t.GradePercentage == null ? 1 : 0) // Academics first, Review second
                .ToList();

            // Logic: The Orange Line needs a value at every point to stay continuous.
            // If a point has no rating (like a Quiz point), we carry over the last known behavior rating.
            double? lastBehavior = 3.0; // Default middle starting point
            foreach (var point in timeline)
            {
                if (point.SoftSkillRating.HasValue)
                    lastBehavior = point.SoftSkillRating.Value;
                else
                    point.SoftSkillRating = lastBehavior;
            }

            // 5. Final Result Construction
            return Ok(new AcademicHealthDashboardDto
            {
                StudentId = studentId,
                CourseId = courseId,
                CourseName = (await _context.Courses.FindAsync(courseId))?.Title ?? "Course",
                CurrentPercentage = currentPct,
                AcademicHealthStatus = currentPct >= 70 ? "On Track" : (currentPct >= 40 ? "Needs Improvement" : "At Risk"),
                Timeline = timeline
            });
        }
    }
}