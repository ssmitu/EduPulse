using EduPulse.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;

namespace EduPulse.API.Data
{
    public static class DbSeeder
    {
        public static void Seed(ApplicationDbContext context, IConfiguration configuration)
        {
            // 1. SAFE LOOKUP: Don't create departments here. Use the ones from DbContext.HasData
            var dept = context.Departments.FirstOrDefault(d => d.Name == "CSE");

            // If database is empty or migration didn't run, we stop to prevent crash
            if (dept == null) return;

            // 2. Seed Student
            if (!context.Users.Any(u => u.Role == UserRole.Student))
            {
                context.Users.Add(new User
                {
                    Name = "John Student",
                    Email = "student@test.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"), // Ensure you have BCrypt installed
                    Role = UserRole.Student,
                    IsVerified = true,
                    DepartmentId = dept.Id
                });
                context.SaveChanges();
            }

            var student = context.Users.FirstOrDefault(u => u.Role == UserRole.Student);
            if (student == null) return;

            // 3. Seed Course & Enrollment
            // Check by Title to prevent duplicates
            var course = context.Courses.FirstOrDefault(c => c.Title == "Programming 101");
            if (course == null)
            {
                course = new Course { Title = "Programming 101" };
                context.Courses.Add(course);
                context.SaveChanges();
            }

            var enrollment = context.Enrollments.FirstOrDefault(e => e.CourseId == course.Id && e.StudentId == student.Id);
            if (enrollment == null)
            {
                enrollment = new Enrollment { CourseId = course.Id, StudentId = student.Id };
                context.Enrollments.Add(enrollment);
                context.SaveChanges();
            }

            // 4. Seed Assessments & Grades
            if (!context.Assessments.Any(a => a.CourseId == course.Id))
            {
                var q1 = new Assessment { Title = "Quiz 1", Date = DateTime.Now.AddDays(-30), MaxMarks = 20, CourseId = course.Id };
                var q2 = new Assessment { Title = "Midterm", Date = DateTime.Now.AddDays(-10), MaxMarks = 50, CourseId = course.Id };

                context.Assessments.AddRange(q1, q2);
                context.SaveChanges();

                context.Grades.AddRange(
                    new Grade { AssessmentId = q1.Id, StudentId = student.Id, MarksObtained = 18, DateEntered = DateTime.Now.AddDays(-30) },
                    new Grade { AssessmentId = q2.Id, StudentId = student.Id, MarksObtained = 35, DateEntered = DateTime.Now.AddDays(-10) }
                );
                context.SaveChanges();
            }

            // 5. Seed Soft Skills
            if (!context.SoftSkills.Any(s => s.EnrollmentId == enrollment.Id))
            {
                context.SoftSkills.AddRange(
                    new SoftSkill { EnrollmentId = enrollment.Id, Discipline = 5, Participation = 5, Collaboration = 5, LastUpdated = DateTime.Now.AddDays(-25) },
                    new SoftSkill { EnrollmentId = enrollment.Id, Discipline = 2, Participation = 3, Collaboration = 2, LastUpdated = DateTime.Now.AddDays(-15) },
                    new SoftSkill { EnrollmentId = enrollment.Id, Discipline = 5, Participation = 4, Collaboration = 5, LastUpdated = DateTime.Now.AddDays(-2) }
                );
                context.SaveChanges();
            }
        }
    }
}