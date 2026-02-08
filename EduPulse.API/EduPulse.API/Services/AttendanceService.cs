using EduPulse.API.Data;
using EduPulse.API.DTOs;
using EduPulse.API.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EduPulse.API.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly ApplicationDbContext _context;

        public AttendanceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task MarkAttendanceAsync(MarkAttendanceRequest request)
        {
            foreach (var item in request.Students)
            {
                var existingRecord = await _context.Attendances
                    .FirstOrDefaultAsync(a => a.CourseId == request.CourseId &&
                                              a.StudentId == item.StudentId &&
                                              a.Date.Date == request.Date.Date);

                if (existingRecord != null)
                {
                    existingRecord.IsPresent = item.IsPresent;
                }
                else
                {
                    var newRecord = new Attendance
                    {
                        CourseId = request.CourseId,
                        StudentId = item.StudentId,
                        Date = request.Date,
                        IsPresent = item.IsPresent
                    };
                    _context.Attendances.Add(newRecord);
                }
            }
            await _context.SaveChangesAsync();
        }

        public async Task<AttendanceSummaryDto> CalculateStudentAttendanceAsync(int courseId, int studentId)
        {
            var records = await _context.Attendances
                .Where(a => a.CourseId == courseId && a.StudentId == studentId)
                .ToListAsync();

            var totalClasses = await _context.Attendances
                .Where(a => a.CourseId == courseId)
                .Select(a => a.Date.Date)
                .Distinct()
                .CountAsync();

            if (totalClasses == 0)
                return new AttendanceSummaryDto { TotalClasses = 0, AttendedClasses = 0, Percentage = 0, GradePoints = 0 };

            var attendedCount = records.Count(a => a.IsPresent);
            double percentage = ((double)attendedCount / totalClasses) * 100;

            int score = 0;
            if (percentage >= 100) score = 10;
            else if (percentage >= 90) score = 9;
            else if (percentage >= 80) score = 8;
            else if (percentage >= 70) score = 7;
            else if (percentage >= 60) score = 6;
            else score = 5;

            return new AttendanceSummaryDto
            {
                TotalClasses = totalClasses,
                AttendedClasses = attendedCount,
                Percentage = Math.Round(percentage, 2),
                GradePoints = score
            };
        }

        public async Task<List<Attendance>> GetCourseAttendanceHistoryAsync(int courseId)
        {
            return await _context.Attendances
                .Where(a => a.CourseId == courseId)
                .OrderBy(a => a.Date)
                .ToListAsync();
        }

        // ✅ ADD THESE TWO METHODS TO FIX THE INTERFACE ERROR
        public async Task<List<Attendance>> GetAttendanceByDateAsync(int courseId, DateTime date)
        {
            return await _context.Attendances
                .Where(a => a.CourseId == courseId && a.Date.Date == date.Date)
                .ToListAsync();
        }

        public async Task DeleteAttendanceByDateAsync(int courseId, DateTime date)
        {
            var records = _context.Attendances
                .Where(a => a.CourseId == courseId && a.Date.Date == date.Date);

            _context.Attendances.RemoveRange(records);
            await _context.SaveChangesAsync();
        }
    }
}