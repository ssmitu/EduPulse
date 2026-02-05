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
        }
    }
}
