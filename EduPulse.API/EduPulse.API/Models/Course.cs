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

        // The Teacher who owns/manages the course
        public int TeacherId { get; set; }
        public User? Teacher { get; set; }

        // The target audience for "Batch Sync"
        public int TargetDeptId { get; set; }
        public Department? TargetDept { get; set; }

        [Range(1, 8)]
        public int TargetSemester { get; set; }

        // Relationship: A course has many students enrolled
        public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    }
}