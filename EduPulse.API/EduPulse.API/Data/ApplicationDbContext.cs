using EduPulse.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EduPulse.API.Data
{
    // ✅ Use NORMAL DbContext (NOT IdentityDbContext)
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // ✅ Explicit Users table (your custom User entity)
        public DbSet<User> Users { get; set; }

        public DbSet<Course> Courses { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<CourseMaterial> CourseMaterials { get; set; }
        public DbSet<Assessment> Assessments { get; set; }
        public DbSet<Grade> Grades { get; set; }
        public DbSet<SoftSkill> SoftSkills { get; set; }

        // ✅ NEW: Attendance Table
        public DbSet<Attendance> Attendances { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Department>()
                .HasMany(d => d.Users)
                .WithOne(u => u.Department)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Course)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Grade>()
                .HasOne(g => g.Student)
                .WithMany(u => u.Grades)
                .HasForeignKey(g => g.StudentId)
                .OnDelete(DeleteBehavior.NoAction);

            // =========================================================
            // ✅ NEW: Attendance Configurations
            // =========================================================

            // 1. Prevent Duplicates: A student can't have two records for the same course on the same day.
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.CourseId, a.StudentId, a.Date })
                .IsUnique();

            // 2. Relationship: Attendance -> Student
            // Use NoAction to prevent "Multiple Cascade Paths" error in SQL Server
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Student)
                .WithMany() // If you add `public ICollection<Attendance> Attendances { get; set; }` to User, put it here.
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.NoAction);

            // 3. Relationship: Attendance -> Course
            // If the course is deleted, the attendance records should be deleted (Cascade).
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Course)
                .WithMany()
                .HasForeignKey(a => a.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}