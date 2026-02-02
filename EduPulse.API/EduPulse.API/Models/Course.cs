using System.ComponentModel.DataAnnotations;

namespace EduPulse.API.Models
{
    public class Course
    {
        public int Id { get; set; }
        [Required]
        public string Title { get; set; } = string.Empty;
        [Required]
        public string Code { get; set; } = string.Empty;

        // This is the link to the teacher who created it
        public int TeacherId { get; set; }
        public User? Teacher { get; set; }

        // These are the "Target Audience" fields for the Batch Sync
        public int TargetDeptId { get; set; }
        public Department? TargetDept { get; set; }

        [Range(1, 8)]
        public int TargetSemester { get; set; } // Stored as 1-8

        // We will add enrollments, assessments, etc., here later
    }
}