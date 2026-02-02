namespace EduPulse.API.Models
{
    public class Enrollment
    {
        public int Id { get; set; }

        public int CourseId { get; set; }
        public Course? Course { get; set; }

        public int StudentId { get; set; }
        public User? Student { get; set; }

        // Useful for your "Irregular Handling" logic
        public string Status { get; set; } = "Regular"; // "Regular", "Retake", "Carry"

        public DateTime EnrolledAt { get; set; } = DateTime.Now;
    }
}