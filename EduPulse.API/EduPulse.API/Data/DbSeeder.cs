using EduPulse.API.Models;

namespace EduPulse.API.Data
{
    public static class DbSeeder
    {
        public static void Seed(ApplicationDbContext context)
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
                var adminDept = context.Departments.First(); // Just link to first dept
                var admin = new User
                {
                    Name = "Super Admin",
                    Email = "admin@edupulse.com",
                    PasswordHash = "admin123", // We will add encryption later
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