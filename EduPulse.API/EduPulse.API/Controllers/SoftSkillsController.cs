using EduPulse.API.Data;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SoftSkillsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SoftSkillsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST: api/SoftSkills/upsert
        [HttpPost("upsert")]
        public async Task<IActionResult> UpsertSoftSkill([FromBody] SoftSkillRequest request)
        {
            // 1. Find the Enrollment based on StudentId and CourseId
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.StudentId == request.StudentId && e.CourseId == request.CourseId);

            if (enrollment == null)
            {
                return NotFound(new { message = "Student is not enrolled in this course." });
            }

            // 2. Find if a rating already exists for this enrollment
            var existingSkill = await _context.SoftSkills
                .FirstOrDefaultAsync(s => s.EnrollmentId == enrollment.Id);

            if (existingSkill == null)
            {
                // 3. Create new
                var newSkill = new SoftSkill
                {
                    EnrollmentId = enrollment.Id, // Link to the correct Enrollment ID found above
                    Discipline = request.Discipline,
                    Participation = request.Participation,
                    Collaboration = request.Collaboration,
                    LastUpdated = DateTime.Now
                };
                _context.SoftSkills.Add(newSkill);
            }
            else
            {
                // 4. Update existing
                existingSkill.Discipline = request.Discipline;
                existingSkill.Participation = request.Participation;
                existingSkill.Collaboration = request.Collaboration;
                existingSkill.LastUpdated = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Soft skills saved successfully!" });
        }

        // GET: api/SoftSkills/enrollment/{enrollmentId}
        [HttpGet("enrollment/{enrollmentId}")]
        public async Task<ActionResult<SoftSkill>> GetSoftSkillByEnrollment(int enrollmentId)
        {
            var skill = await _context.SoftSkills
                .FirstOrDefaultAsync(s => s.EnrollmentId == enrollmentId);

            if (skill == null)
            {
                return Ok(new { enrollmentId, discipline = 1, participation = 1, collaboration = 1 });
            }

            return Ok(skill);
        }
    }

    // ✅ DTO defined locally to ensure it matches the Frontend request
    public class SoftSkillRequest
    {
        public int StudentId { get; set; }
        public int CourseId { get; set; }
        public int Discipline { get; set; }
        public int Participation { get; set; }
        public int Collaboration { get; set; }
    }
}