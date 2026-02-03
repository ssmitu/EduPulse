using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Only logged-in users can access these endpoints
    public class CoursesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CoursesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. GET: Fetch courses based on role (Teacher / Student / Admin)
        [HttpGet]
        public async Task<IActionResult> GetMyCourses()
        {
            // 1. Get current User ID and Role from Token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            var roleClaim = User.FindFirst(ClaimTypes.Role);

            if (userIdClaim == null || roleClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);
            string userRole = roleClaim.Value;

            // 2. Logic for TEACHERS: Show only courses they created
            if (userRole == "Teacher")
            {
                var teacherCourses = await _context.Courses
                    .Where(c => c.TeacherId == userId)
                    .Include(c => c.TargetDept)
                    .Select(c => new
                    {
                        c.Id,
                        c.Title,
                        c.Code,
                        DeptName = c.TargetDept != null ? c.TargetDept.Name : "N/A",
                        Year = (c.TargetSemester + 1) / 2,
                        Semester = c.TargetSemester % 2 == 0 ? 2 : 1
                    })
                    .ToListAsync();

                return Ok(teacherCourses);
            }

            // 3. Logic for STUDENTS: Show only courses they are ENROLLED in
            if (userRole == "Student")
            {
                var studentCourses = await _context.Enrollments
                    .Where(e => e.StudentId == userId)
                    .Include(e => e.Course)
                        .ThenInclude(c => c!.TargetDept)
                    .Include(e => e.Course!.Teacher) // Ensures TeacherName is not null
                    .Select(e => new
                    {
                        e.Course!.Id,
                        e.Course.Title,
                        e.Course.Code,
                        DeptName = e.Course.TargetDept != null ? e.Course.TargetDept.Name : "N/A",
                        TeacherName = e.Course.Teacher != null ? e.Course.Teacher.Name : "Unknown",
                        Year = (e.Course.TargetSemester + 1) / 2,
                        Semester = e.Course.TargetSemester % 2 == 0 ? 2 : 1,
                        e.Status // "Regular" or "Retake"
                    })
                    .ToListAsync();

                return Ok(studentCourses);
            }

            // 4. Logic for ADMIN: Show all courses
            var allCourses = await _context.Courses
                .Include(c => c.TargetDept)
                .Include(c => c.Teacher)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Code,
                    DeptName = c.TargetDept != null ? c.TargetDept.Name : "N/A",
                    TeacherName = c.Teacher != null ? c.Teacher.Name : "Unknown",
                    Year = (c.TargetSemester + 1) / 2,
                    Semester = c.TargetSemester % 2 == 0 ? 2 : 1
                })
                .ToListAsync();

            return Ok(allCourses);
        }

        // 2. POST: Create a Course
        [HttpPost]
        public async Task<IActionResult> CreateCourse(CourseCreateDto dto)
        {
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
                    e.Status
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

        // 6. GET: Logged-in student's enrolled courses
        [HttpGet("my-courses")]
        public async Task<IActionResult> GetStudentCourses()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            int studentId = int.Parse(userIdClaim.Value);

            var courses = await _context.Enrollments
                .Where(e => e.StudentId == studentId)
                .Include(e => e.Course)
                    .ThenInclude(c => c!.Teacher)
                .Select(e => new
                {
                    e.Course!.Id,
                    e.Course.Title,
                    e.Course.Code,
                    TeacherName = e.Course.Teacher != null
                        ? e.Course.Teacher.Name
                        : "Unknown",
                    e.Status
                })
                .ToListAsync();

            return Ok(courses);
        }

        // 7. GET: Course materials / announcements with enrollment check for students
        [HttpGet("{courseId}/materials")]
        public async Task<IActionResult> GetMaterials(int courseId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var role = User.FindFirst(ClaimTypes.Role)!.Value;

            // If it's a student, check if they are actually enrolled in THIS course
            if (role == "Student")
            {
                bool isEnrolled = await _context.Enrollments
                    .AnyAsync(e => e.CourseId == courseId && e.StudentId == userId);

                if (!isEnrolled)
                    return Forbid("You are not enrolled in this course.");
            }

            var materials = await _context.CourseMaterials
                .Where(m => m.CourseId == courseId)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Ok(materials);
        }


        // 8. POST: Upload material or announcement
        [HttpPost("{courseId}/upload")]
        public async Task<IActionResult> UploadMaterial(
            int courseId,
            [FromForm] string title,
            [FromForm] string? description,
            IFormFile? file
        )
        {
            var material = new CourseMaterial
            {
                CourseId = courseId,
                Title = title,
                Description = description,
                MaterialType = file != null ? "File" : "Announcement"
            };

            if (file != null)
            {
                var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "Uploads",
                    fileName
                );

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                material.FileName = file.FileName;
                material.FileUrl = "/Uploads/" + fileName;
            }

            _context.CourseMaterials.Add(material);
            await _context.SaveChangesAsync();

            return Ok(material);
        }
    }
}
