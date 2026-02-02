using EduPulse.API.Models;
using Microsoft.Extensions.Configuration;

namespace EduPulse.API.Data
{
    public static class DbSeeder
    {
        public static void Seed(
            ApplicationDbContext context,
            IConfiguration configuration
        )
        {
            // 1. Seed Departments if empty
            if (!context.Departments.Any())
            {
                var depts = new List<Department>
                {
                    new Department { Name = "CSE", TeacherVerificationKey = "CSE_AUST_2025" },
                    new Department { Name = "EEE", TeacherVerificationKey = "EEE_AUST_2025" },
                    new Department { Name = "ME", TeacherVerificationKey = "ME_AUST_2025" },
                    new Department { Name = "CE", TeacherVerificationKey = "CE_AUST_2025" }
                };

                context.Departments.AddRange(depts);
                context.SaveChanges();
            }

            // 2. Seed Admin User if empty
            if (!context.Users.Any(u => u.Role == UserRole.Admin))
            {
                var adminEmail = configuration["InitialAdmin:Email"];
                var adminPass = configuration["InitialAdmin:Password"];
                var adminName = configuration["InitialAdmin:Name"];

                var adminDept = context.Departments.First();

                var admin = new User
                {
                    Name = adminName ?? "Admin",
                    Email = adminEmail ?? "admin@edupulse.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                        adminPass ?? "DefaultPass123!"
                    ),
                    Role = UserRole.Admin,
                    IsVerified = true,
                    DepartmentId = adminDept.Id
                };

                context.Users.Add(admin);
                context.SaveChanges();
            }
        }
    }
}
