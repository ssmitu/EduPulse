using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPulse.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDailySoftSkillTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SoftSkills_EnrollmentId",
                table: "SoftSkills");

            migrationBuilder.AddColumn<DateTime>(
                name: "Date",
                table: "SoftSkills",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_SoftSkills_EnrollmentId_Date",
                table: "SoftSkills",
                columns: new[] { "EnrollmentId", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SoftSkills_EnrollmentId_Date",
                table: "SoftSkills");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "SoftSkills");

            migrationBuilder.CreateIndex(
                name: "IX_SoftSkills_EnrollmentId",
                table: "SoftSkills",
                column: "EnrollmentId");
        }
    }
}
