using System.ComponentModel.DataAnnotations;

namespace EduPulse.API.Models
{
    public enum UserRole
    {
        Admin,
        Teacher,
        Student
    }

    public class User
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public UserRole Role { get; set; }

        public bool IsVerified { get; set; } = false;

        public int? CurrentSemester { get; set; }

        // Foreign Key for Department
        public int DepartmentId { get; set; }
        public Department? Department { get; set; }
    }
}