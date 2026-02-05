using EduPulse.API.Data;
using EduPulse.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[Authorize(Roles = "Teacher,Admin")]
[ApiController]
[Route("api/[controller]")]
public class AssessmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AssessmentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("gradebook/{courseId}")]
    public async Task<IActionResult> GetGradebook(int courseId)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null) return NotFound();

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (!int.TryParse(userIdString, out var userId)) return Unauthorized();

        if (role != "Admin" && course.TeacherId != userId) return Forbid();

        return Ok(new
        {
            assessments = await _context.Assessments.Where(a => a.CourseId == courseId).ToListAsync(),
            grades = await _context.Grades.Where(g => g.Assessment!.CourseId == courseId).ToListAsync(),
            enrollments = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student)
                .ToListAsync(),
            policy = course.GradingPolicy
        });
    }

    // ✅ NEW: Allows adding columns/assessments (Fixes 404 on Add Column)
    [HttpPost]
    public async Task<IActionResult> CreateAssessment([FromBody] Assessment assessment)
    {
        if (assessment == null) return BadRequest();

        _context.Assessments.Add(assessment);
        await _context.SaveChangesAsync();
        return Ok(assessment);
    }

    // ✅ NEW: Allows deleting columns (Fixes 404 on Trash Icon)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssessment(int id)
    {
        var assessment = await _context.Assessments.FindAsync(id);
        if (assessment == null) return NotFound();

        _context.Assessments.Remove(assessment);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("course/{courseId}/policy")]
    public async Task<IActionResult> UpdatePolicy(int courseId, [FromBody] System.Text.Json.JsonElement body)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null) return NotFound();

        if (body.TryGetProperty("policy", out var policyProp))
        {
            course.GradingPolicy = policyProp.GetString() ?? "Best 2 of 3 Quizzes";
            await _context.SaveChangesAsync();
            return Ok();
        }
        return BadRequest("Invalid policy data");
    }
}