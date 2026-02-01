using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AuthController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            // 1. Basic Existence Check
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest("Email is already registered.");
            }

            // 2. AUST Student Rule
            // 2. AUST Student Rule & Range Validation
            if (dto.Role == "Student")
            {
                if (!dto.Email.ToLower().EndsWith("@aust.edu"))
                {
                    return BadRequest("Students must use an @aust.edu email address.");
                }

                if (!dto.Year.HasValue || !dto.Semester.HasValue)
                {
                    return BadRequest("Students must select both Year and Semester.");
                }
            }

            // 3. Department & Key Validation
            var department = await _context.Departments.FindAsync(dto.DepartmentId);
            if (department == null)
            {
                return BadRequest("Invalid Department selected.");
            }

            bool isVerified = false;

            if (dto.Role == "Teacher")
            {
                if (department.TeacherVerificationKey != dto.VerificationKey)
                {
                    return BadRequest("Invalid Departmental Verification Key.");
                }
                isVerified = false; // Pending Admin Approval
            }
            else if (dto.Role == "Student")
            {
                isVerified = true; // Auto-verified
            }

            // 4. Year/Semester to Flat Level Conversion (1-8)
            int? flatSemester = null;
            if (dto.Role == "Student" && dto.Year.HasValue && dto.Semester.HasValue)
            {
                flatSemester = ((dto.Year.Value - 1) * 2) + dto.Semester.Value;
            }

            // 5. Create User
            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = dto.Password, // Hashing to be added later
                Role = Enum.Parse<UserRole>(dto.Role),
                DepartmentId = dto.DepartmentId,
                CurrentSemester = flatSemester,
                IsVerified = isVerified
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful!", isVerified = user.IsVerified });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.Department)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || user.PasswordHash != dto.Password)
            {
                return Unauthorized("Invalid email or password.");
            }

            if (!user.IsVerified)
            {
                return BadRequest("Your account is pending approval by the Admin.");
            }

            // Convert Flat Semester (1-8) back to Year/Semester for the Frontend
            int? displayYear = user.CurrentSemester.HasValue ? (user.CurrentSemester.Value + 1) / 2 : null;
            int? displaySemester = user.CurrentSemester.HasValue ? (user.CurrentSemester.Value % 2 == 0 ? 2 : 1) : null;

            return Ok(new
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString(),
                Department = user.Department?.Name,
                Year = displayYear,
                Semester = displaySemester
            });
        }
        [HttpGet("pending-teachers")]
        public async Task<IActionResult> GetPendingTeachers()
        {
            // In a real app, we'd check if the person calling this is an Admin.
            // For now, we just fetch all unverified teachers.
            var pending = await _context.Users
                .Where(u => u.Role == UserRole.Teacher && !u.IsVerified)
                .Select(u => new { u.Id, u.Name, u.Email, u.DepartmentId })
                .ToListAsync();

            return Ok(pending);
        }

        [HttpPost("approve-teacher/{id}")]
        public async Task<IActionResult> ApproveTeacher(int id)
        {
            var teacher = await _context.Users.FindAsync(id);
            if (teacher == null) return NotFound("Teacher not found.");

            teacher.IsVerified = true;
            await _context.SaveChangesAsync();

            return Ok($"{teacher.Name} has been approved.");
        }
    }
}
