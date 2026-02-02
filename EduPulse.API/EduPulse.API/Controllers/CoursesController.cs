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
                .Select(c => new
                {
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

        // 4. GET: Enrolled students for a course
        [HttpGet("{courseId}/students")]
        public async Task<IActionResult> GetEnrolledStudents(int courseId)
        {
            var students = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .Select(e => new
                {
                    e.StudentId,
                    e.Student!.Name,
                    e.Student.Email,
                    e.Status // Regular or Retake
                })
                .ToListAsync();

            return Ok(students);
        }

        // 5. POST: Manually enroll a student (Irregular / Retake)
        [HttpPost("{courseId}/enroll-manual")]
        public async Task<IActionResult> EnrollManual(int courseId, [FromBody] string studentEmail)
        {
            var student = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.Email == studentEmail &&
                    u.Role == UserRole.Student
                );

            if (student == null)
                return NotFound("Student not found with that email.");

            bool exists = await _context.Enrollments
                .AnyAsync(e => e.CourseId == courseId && e.StudentId == student.Id);

            if (exists)
                return BadRequest("Student is already enrolled.");

            _context.Enrollments.Add(new Enrollment
            {
                CourseId = courseId,
                StudentId = student.Id,
                Status = "Retake"
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"{student.Name} enrolled as Irregular/Retake student."
            });
        }
    }
}
