import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
// ✅ Import the new component
import AttendanceProgress from './AttendanceProgress';

const StudentGradeView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState({
        courseTitle: '',
        courseCode: '',
        policy: '',
        assessments: [],
        grades: []
    });
    const [loading, setLoading] = useState(true);

    const API_BASE = "https://localhost:7096/api";

    useEffect(() => {
        const fetchMyGrades = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(`${API_BASE}/Grades/student/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (error) {
                console.error("Error fetching grades:", error);
                alert("Could not load grades.");
            } finally {
                setLoading(false);
            }
        };

        fetchMyGrades();
    }, [courseId]);

    const calculateStats = () => {
        const myGrades = data.grades || [];
        const quizAssessments = (data.assessments || []).filter(a => a.type === 1);

        let quizScore = 0;
        if (quizAssessments.length > 0) {
            const scores = quizAssessments.map(a => {
                const g = myGrades.find(gr => gr.assessmentId === a.id);
                return g ? (parseFloat(g.marksObtained) || 0) : 0;
            });
            scores.sort((a, b) => b - a);
            const pickCount = data.policy?.includes('Best 3') ? 3 : 2;
            const sum = scores.slice(0, pickCount).reduce((acc, val) => acc + val, 0);
            quizScore = sum / pickCount;
        }

        let attdScore = 0;
        const attd = (data.assessments || []).find(a => a.type === 0);
        if (attd) {
            const g = myGrades.find(gr => gr.assessmentId === attd.id);
            attdScore = g ? (parseFloat(g.marksObtained) || 0) : 0;
        }

        let finalScore = 0;
        const final = (data.assessments || []).find(a => a.type === 3);
        if (final) {
            const g = myGrades.find(gr => gr.assessmentId === final.id);
            finalScore = g ? (parseFloat(g.marksObtained) || 0) : 0;
        }

        const total = quizScore + attdScore + finalScore;

        return {
            attendance: attdScore.toFixed(2),
            quizzes: quizScore.toFixed(2),
            final: finalScore.toFixed(2),
            total: Math.min(total, 100).toFixed(2)
        };
    };

    if (loading) return <div className="dashboard-container">Loading Result...</div>;

    const stats = calculateStats();
    const isPass = parseFloat(stats.total) >= 40;

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Course No: {data.courseCode}</h2>
                    <span style={{ fontSize: '1.1rem', color: '#555', fontWeight: '500' }}>Course Name: {data.courseTitle}</span>
                </div>
            </div>

            <div className="user-info-card" style={{ marginTop: '20px' }}>

                {/* ✅ NEW: Visual Attendance Progress Bar shows up first */}
                <AttendanceProgress courseId={courseId} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                    {/* LEFT: Detailed Breakdown */}
                    <div>
                        <h4>Assessment Breakdown</h4>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Assessment</th>
                                    <th>Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.assessments.map(a => {
                                    const g = data.grades.find(gr => gr.assessmentId === a.id);
                                    return (
                                        <tr key={a.id}>
                                            <td>{a.title}</td>
                                            <td>{g ? g.marksObtained : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* RIGHT: Final Calculation */}
                    <div>
                        <h4>Final Score Calculation</h4>
                        <div className="course-card" style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Attendance (10%):</span>
                                <strong>{stats.attendance}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Quizzes (20%):</span>
                                <strong>{stats.quizzes}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Final Exam (70%):</span>
                                <strong>{stats.final}</strong>
                            </div>
                            <hr />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '1.2rem' }}>
                                <span>Total:</span>
                                <strong>{stats.total}%</strong>
                            </div>
                            <div style={{
                                marginTop: '15px',
                                textAlign: 'center',
                                padding: '10px',
                                borderRadius: '5px',
                                backgroundColor: isPass ? '#d4edda' : '#f8d7da',
                                color: isPass ? '#155724' : '#721c24',
                                fontWeight: 'bold'
                            }}>
                                STATUS: {isPass ? 'PASS' : 'FAIL'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentGradeView;