using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Only logged-in users can touch these endpoints
    public class CoursesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CoursesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET: Fetch all courses (for the list)
        [HttpGet]
        public async Task<IActionResult> GetAllCourses()
        {
            var courses = await _context.Courses
                .Include(c => c.TargetDept)
                .Select(c => new {
                    c.Id,
                    c.Title,
                    c.Code,
                    c.TargetDeptId,
                    DeptName = c.TargetDept != null ? c.TargetDept.Name : "N/A",
                    c.TargetSemester,
                    Year = (c.TargetSemester + 1) / 2,
                    Semester = c.TargetSemester % 2 == 0 ? 2 : 1
                })
                .ToListAsync();

            return Ok(courses);
        }

        // 2. POST: Create a Course
        [HttpPost]
        public async Task<IActionResult> CreateCourse(CourseCreateDto dto)
        {
            // Extract Teacher ID from the JWT Token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int teacherId = int.Parse(userIdClaim.Value);

            int flatSemester = ((dto.Year - 1) * 2) + dto.Semester;

            var course = new Course
            {
                Title = dto.Title,
                Code = dto.Code,
                TargetDeptId = dto.TargetDeptId,
                TargetSemester = flatSemester,
                TeacherId = teacherId
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();
            return Ok(course);
        }

        // 3. POST: Sync Batch
        [HttpPost("sync/{courseId}")]
        public async Task<IActionResult> SyncBatch(int courseId)
        {
            var course = await _context.Courses.FindAsync(courseId);
            if (course == null) return NotFound("Course not found.");

            var targetStudents = await _context.Users
                .Where(u => u.Role == UserRole.Student &&
                            u.DepartmentId == course.TargetDeptId &&
                            u.CurrentSemester == course.TargetSemester)
                .ToListAsync();

            int enrolledCount = 0;

            foreach (var student in targetStudents)
            {
                bool exists = await _context.Enrollments
                    .AnyAsync(e => e.CourseId == courseId && e.StudentId == student.Id);

                if (!exists)
                {
                    _context.Enrollments.Add(new Enrollment
                    {
                        CourseId = courseId,
                        StudentId = student.Id,
                        Status = "Regular"
                    });
                    enrolledCount++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Successfully synced! {enrolledCount} students enrolled." });
        }
    }
}