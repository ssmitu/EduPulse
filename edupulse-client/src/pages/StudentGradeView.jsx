import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';

// Register components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

const StudentGradeView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState({ courseTitle: '', courseCode: '', policy: '', assessments: [], grades: [], enrollmentId: null });
    const [softSkills, setSoftSkills] = useState(null);
    const [gapAnalysis, setGapAnalysis] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_BASE = "https://localhost:7096/api";

    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                // 1. Fetch Grades
                const res = await axios.get(`${API_BASE}/Grades/student/${courseId}`, config);
                setData(res.data);

                // 2. Fetch Soft Skills
                if (res.data.enrollmentId) {
                    const skillRes = await axios.get(`${API_BASE}/SoftSkills/enrollment/${res.data.enrollmentId}`, config);
                    setSoftSkills(skillRes.data);
                }

                // 3. Fetch Gap Analysis
                const gapRes = await axios.get(`${API_BASE}/Grades/gap-analysis/${courseId}`, config);
                setGapAnalysis(gapRes.data);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [courseId]);

    // --- GAP ANALYSIS CHART DATA (Straight lines for accuracy) ---
    const gapChartData = {
        labels: gapAnalysis.map(a => a.assessmentTitle),
        datasets: [
            {
                label: 'My Score (%)',
                data: gapAnalysis.map(a => a.myPercentage),
                borderColor: '#4a90e2',
                backgroundColor: '#4a90e2',
                tension: 0, // FIXED: Set to 0 to prevent curving above 100%
                borderWidth: 4,
                pointRadius: 6,
                pointHoverRadius: 8
            },
            {
                label: 'Class Average (%)',
                data: gapAnalysis.map(a => a.classAveragePercentage),
                borderColor: '#e74c3c',
                backgroundColor: '#e74c3c',
                borderDash: [5, 5],
                tension: 0, // FIXED: Set to 0 to prevent curving above 100%
                borderWidth: 4,
                pointRadius: 6,
                pointHoverRadius: 8
            }
        ]
    };

    // --- Radar Chart Data ---
    const radarData = {
        labels: ['Discipline', 'Participation', 'Collaboration'],
        datasets: [{
            label: 'Behavioral Rating (1-5)',
            data: [softSkills?.discipline || 0, softSkills?.participation || 0, softSkills?.collaboration || 0],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
        }]
    };

    if (loading) return <div className="dashboard-container">Loading Result Details...</div>;

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0 }}>Course No: {data.courseCode}</h2>
                    <p style={{ margin: 0, fontWeight: '500', color: '#666' }}>Course Name: {data.courseTitle}</p>
                </div>
            </div>

            {/* GAP ANALYSIS SECTION */}
            <div className="user-info-card" style={{ marginTop: '20px', border: '1px solid #4a90e2' }}>
                <h3 style={{ color: '#4a90e2', marginBottom: '15px' }}>📊 Gap Analysis: My Performance vs. Class Average</h3>
                <div style={{ height: '350px' }}>
                    <Line
                        data={gapChartData}
                        options={{
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    min: 0,
                                    max: 110, // Keep at 110 so the 100% dots are not cut off
                                    ticks: {
                                        stepSize: 20,
                                        callback: (value) => value <= 100 ? value + '%' : ''
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                }
                            }
                        }}
                    />
                </div>
            </div>

            <div className="user-info-card" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                {/* Assessment Table */}
                <div>
                    <h4>Assessment Breakdown</h4>
                    <table className="admin-table">
                        <thead>
                            <tr><th>Assessment</th><th style={{ textAlign: 'center' }}>Marks Obtained</th></tr>
                        </thead>
                        <tbody>
                            {data.assessments.map(a => {
                                const g = data.grades.find(gr => gr.assessmentId === a.id);
                                return (
                                    <tr key={a.id}>
                                        <td>{a.title}</td>
                                        <td style={{ textAlign: 'center' }}>{g ? g.marksObtained : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Soft Skills Radar */}
                <div style={{ textAlign: 'center', borderLeft: '1px solid #eee' }}>
                    <h4>Behavioral Evaluation</h4>
                    <div style={{ width: '280px', margin: '0 auto' }}>
                        <Radar
                            data={radarData}
                            options={{
                                scales: {
                                    r: {
                                        suggestedMin: 0,
                                        suggestedMax: 5,
                                        ticks: { stepSize: 1, display: false }
                                    }
                                }
                            }}
                        />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#777', marginTop: '10px' }}>
                        Ratings provided by Course Teacher
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentGradeView;