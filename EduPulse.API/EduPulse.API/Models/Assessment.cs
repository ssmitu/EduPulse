using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace EduPulse.API.Models
{
    // This was missing! It defines the valid types for your assessments
    public enum AssessmentType { Attendance, Quiz, Midterm, FinalExam, Assignment }

    public class Assessment
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } // e.g. "Quiz 1", "Final Exam"

        public AssessmentType Type { get; set; }

        public double MaxMarks { get; set; } // e.g. 20

        public double Weightage { get; set; } // e.g. 10 for 10%

        public int CourseId { get; set; }

        // Navigation Properties - [JsonIgnore] prevents the "Course field is required" error
        [JsonIgnore]
        public Course? Course { get; set; }

        [JsonIgnore]
        public ICollection<Grade>? Grades { get; set; } = new List<Grade>();
    }
}