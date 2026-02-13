using System;
using System.Collections.Generic;

namespace EduPulse.API.DTOs
{
    public class AcademicHealthDashboardDto
    {
        public int StudentId { get; set; }
        public int CourseId { get; set; }
        public string CourseName { get; set; } = string.Empty;
        public double CurrentPercentage { get; set; }
        public string AcademicHealthStatus { get; set; } = string.Empty;
        public List<PerformanceTimelinePoint> Timeline { get; set; } = new();
    }

    public class PerformanceTimelinePoint
    {
        public string EventName { get; set; } = string.Empty; // "Quiz 1" or "Behavior Update"
        public DateTime Date { get; set; }
        public double? GradePercentage { get; set; } // Null if only behavior was updated
        public double? SoftSkillRating { get; set; } // Null if only a grade was entered
    }
}