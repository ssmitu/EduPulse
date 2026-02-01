using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        // Constructor now accepts IConfiguration to read the secret key from appsettings.json
        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest("Email is already registered.");
            }

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
                isVerified = false;
            }
            else if (dto.Role == "Student")
            {
                isVerified = true;
            }

            int? flatSemester = null;
            if (dto.Role == "Student" && dto.Year.HasValue && dto.Semester.HasValue)
            {
                flatSemester = ((dto.Year.Value - 1) * 2) + dto.Semester.Value;
            }

            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
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

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            if (!user.IsVerified)
            {
                return BadRequest("Your account is pending approval by the Admin.");
            }

            int? displayYear = user.CurrentSemester.HasValue ? (user.CurrentSemester.Value + 1) / 2 : null;
            int? displaySemester = user.CurrentSemester.HasValue ? (user.CurrentSemester.Value % 2 == 0 ? 2 : 1) : null;

            // Generate JWT Token
            var token = GenerateJwtToken(user);

            return Ok(new
            {
                Token = token,
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

        // Helper Method to generate the JWT Token
        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // Payload: Data stored inside the token
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("Department", user.Department?.Name ?? "N/A")
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7), // Token valid for 7 days
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}