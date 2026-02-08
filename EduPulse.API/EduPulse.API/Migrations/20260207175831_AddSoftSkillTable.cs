using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPulse.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftSkillTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SoftSkills",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false),
                    Discipline = table.Column<int>(type: "int", nullable: false),
                    Participation = table.Column<int>(type: "int", nullable: false),
                    Collaboration = table.Column<int>(type: "int", nullable: false),
                    LastUpdated = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SoftSkills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SoftSkills_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "Enrollments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SoftSkills_EnrollmentId",
                table: "SoftSkills",
                column: "EnrollmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SoftSkills");
        }
    }
}
