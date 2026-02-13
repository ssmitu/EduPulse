import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const AcademicPerformanceTab = ({ studentId, courseId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = "https://localhost:7096";

    useEffect(() => {
        const cleanStudentId = String(studentId).replace(':', '');
        const cleanCourseId = String(courseId).replace(':', '');

        fetch(`${API_BASE_URL}/api/studentperformance/dashboard/${cleanStudentId}/${cleanCourseId}`)
            .then(res => res.json())
            .then(json => {
                setData(json);
                setLoading(false);
            })
            .catch(err => console.error("Fetch error:", err));
    }, [studentId, courseId]);

    if (loading || !data) return <div className="p-10 text-center text-gray-400">Loading Performance Data...</div>;

    const timeline = data.timeline;

    const chartData = {
        labels: timeline.map(p => p.eventName),
        datasets: [
            {
                label: 'Grades (%)',
                data: timeline.map(p => p.gradePercentage),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderWidth: 3,
                tension: 0,
                spanGaps: true,
                pointRadius: ctx => timeline[ctx.dataIndex].gradePercentage != null ? 6 : 0,
                pointBackgroundColor: '#fff',
                yAxisID: 'y'
            },
            {
                label: 'Weekly Soft Skills (1-5)',
                data: timeline.map(p => p.softSkillRating),
                borderColor: '#f59e0b',
                borderDash: [5, 5],
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#f59e0b',
                yAxisID: 'y1'
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                labels: { boxWidth: 40, padding: 20 }
            },
            tooltip: {
                callbacks: {
                    title: (context) => {
                        const date = new Date(timeline[context[0].dataIndex].date).toLocaleDateString();
                        return `${timeline[context[0].dataIndex].eventName} (${date})`;
                    }
                }
            }
        },
        scales: {
            y: { min: 0, max: 100, title: { display: true, text: 'Exam Score %', color: '#3b82f6' } },
            y1: { min: 1, max: 5, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Soft Skill Rating', color: '#f59e0b' } }
        }
    };

    return (
        <div className="user-info-card" style={{ border: '1px solid #e5e7eb', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>

            {/* --- FIXED HEALTH BAR SECTION --- */}
            <div className="health-bar-wrapper" style={{ marginBottom: '60px' }}> {/* Increased margin to avoid clashing with chart legend */}
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-bold text-gray-800">
                        Academic Health: <span style={{ color: data.currentPercentage >= 40 ? '#10b981' : '#ef4444' }}>{data.academicHealthStatus}</span>
                    </h3>
                    <p className="text-3xl font-black text-gray-900">{data.currentPercentage}%</p>
                </div>

                <div style={{ position: 'relative', height: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ width: `${data.currentPercentage}%`, height: '100%', borderRadius: '8px', background: data.currentPercentage >= 40 ? '#10b981' : '#ef4444', transition: 'width 1s ease' }} />

                    {/* FIXED PASS MARK: Moved label ABOVE the bar to stop overlapping with the graph legend */}
                    <div style={{ position: 'absolute', left: '40%', top: '-8px', height: '32px', width: '2px', background: '#374151', zIndex: 10 }}>
                        <span style={{
                            position: 'absolute',
                            top: '-20px', // Moves text above the indicator
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '11px',
                            fontWeight: '900',
                            color: '#374151',
                            whiteSpace: 'nowrap',
                            background: '#fff',
                            padding: '0 4px',
                            border: '1px solid #374151',
                            borderRadius: '3px'
                        }}>
                            PASS (40%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div style={{ height: '380px', marginTop: '20px' }}>
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm text-blue-800 italic m-0">
                    <strong>Weekly Trend:</strong> The orange dashed line shows your Sunday–Thursday soft skill average. The blue line tracks your gradebook assessments over time.
                </p>
            </div>
        </div>
    );
};

export default AcademicPerformanceTab;