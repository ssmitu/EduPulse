using EduPulse.API.Data;
using EduPulse.API.DTOs;
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
        public async Task<IActionResult> UpsertSoftSkill(SoftSkillUpdateDto dto)
        {
            // 1. Find if a rating already exists for this enrollment
            var existingSkill = await _context.SoftSkills
                .FirstOrDefaultAsync(s => s.EnrollmentId == dto.EnrollmentId);

            if (existingSkill == null)
            {
                // 2. If it doesn't exist, create a new one
                var newSkill = new SoftSkill
                {
                    EnrollmentId = dto.EnrollmentId,
                    Discipline = dto.Discipline,
                    Participation = dto.Participation,
                    Collaboration = dto.Collaboration,
                    LastUpdated = DateTime.Now
                };
                _context.SoftSkills.Add(newSkill);
            }
            else
            {
                // 3. If it exists, update the values
                existingSkill.Discipline = dto.Discipline;
                existingSkill.Participation = dto.Participation;
                existingSkill.Collaboration = dto.Collaboration;
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
                // Return a default object if no rating exists yet
                return Ok(new { enrollmentId, discipline = 1, participation = 1, collaboration = 1 });
            }

            return Ok(skill);
        }
    }
}