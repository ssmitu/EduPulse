import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const Gradebook = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    // 1. Data State
    const [data, setData] = useState({
        assessments: [],
        enrollments: [],
        grades: [],
        policy: 'Best 2 of 3 Quizzes'
    });

    // 2. Refresh Trigger & UI States
    const [refreshKey, setRefreshKey] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCol, setNewCol] = useState({ title: '', type: 1, maxMarks: 20 });

    // --- STATE FOR SOFT SKILLS ---
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [softSkills, setSoftSkills] = useState({
        discipline: 3,
        participation: 3,
        collaboration: 3
    });

    const API_BASE = "https://localhost:7096/api";

    // 3. MAIN DATA FETCHING EFFECT
    useEffect(() => {
        const fetchAllData = async () => {
            const localToken = localStorage.getItem('token');
            if (!localToken) return;

            const config = { headers: { Authorization: `Bearer ${localToken}` } };
            try {
                const res = await axios.get(`${API_BASE}/Grades/course/${courseId}`, config);

                const rawStudents = res.data.students || res.data.Students || [];
                const rawAssessments = res.data.assessments || res.data.Assessments || [];
                const rawGrades = res.data.grades || res.data.Grades || [];
                const rawPolicy = res.data.policy || res.data.Policy || 'Best 2 of 3 Quizzes';

                setData({
                    assessments: rawAssessments,
                    grades: rawGrades,
                    enrollments: rawStudents.map(s => ({
                        studentId: s.studentId || s.StudentId,
                        student: { name: s.name || s.Name || "Unknown" }
                    })),
                    policy: rawPolicy
                });
            } catch (error) {
                console.error("Fetch error:", error);
            }
        };

        fetchAllData();
    }, [courseId, refreshKey]);

    // --- HANDLER TO FETCH LATEST SKILLS & OPEN MODAL ---
    const handleOpenRateModal = async (enrollment) => {
        setSelectedEnrollment(enrollment);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // Fetch the latest entry so the teacher doesn't start from scratch
            const res = await axios.get(`${API_BASE}/SoftSkills/enrollment/${enrollment.studentId}/${courseId}`, config);
            if (res.data) {
                setSoftSkills({
                    discipline: res.data.discipline || 3,
                    participation: res.data.participation || 3,
                    collaboration: res.data.collaboration || 3
                });
            }
        } catch (error) {
            console.error("Fetch skills error:", error); // Use the variable here
            setSoftSkills({ discipline: 3, participation: 3, collaboration: 3 });
        }
    };

    const handleSaveSoftSkills = async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/SoftSkills/upsert`, {
                studentId: selectedEnrollment.studentId,
                courseId: parseInt(courseId),
                discipline: softSkills.discipline,
                participation: softSkills.participation,
                collaboration: softSkills.collaboration
            }, config);

            alert(`Weekly behavior recorded for ${selectedEnrollment.student.name}`);
            setSelectedEnrollment(null);
        } catch (error) {
            console.error("Save skills error:", error); // Use the variable here
            alert("Error saving soft skills.");
        }
    };

    // --- GRADING POLICY HANDLER ---
    const handlePolicyChange = async (newPolicy) => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments/course/${courseId}/policy`, { policy: newPolicy }, config);
            setData(prev => ({ ...prev, policy: newPolicy }));
        } catch {
            alert("Failed to update policy");
        }
    };

    // --- DELETE COLUMN HANDLER ---
    const handleDeleteColumn = async (id) => {
        if (!window.confirm("Delete this column and all its marks?")) return;
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.delete(`${API_BASE}/Assessments/${id}`, config);
            setRefreshKey(old => old + 1);
        } catch {
            alert("Delete failed.");
        }
    };

    // --- ADD COLUMN HANDLER ---
    const handleAddColumn = async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments`,
                {
                    ...newCol,
                    date: new Date().toISOString(), // FIXED: Prevents 1/1/1 bug
                    weightage: 0,
                    courseId: parseInt(courseId)
                },
                config
            );
            setShowAddModal(false);
            setRefreshKey(old => old + 1);
        } catch {
            alert("Error adding column");
        }
    };

    // --- UPDATE MARKS ---
    const updateMark = async (studentId, assessmentId, mark) => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const numericMark = parseFloat(mark) || 0;

        try {
            await axios.post(`${API_BASE}/Grades/bulk-update`,
                [{ studentId, assessmentId, marksObtained: numericMark }],
                config
            );
            setRefreshKey(old => old + 1);
        } catch (error) {
            console.error("Mark update failed", error);
        }
    };

    // --- CALCULATION LOGIC (Best X of Y) ---
    const calculateStats = (studentId) => {
        const studentGrades = (data.grades || []).filter(g => (g.studentId || g.StudentId) === studentId);
        const assessments = data.assessments || [];

        // 1. Quizzes
        const quizAssessments = assessments.filter(a => (a.type === 1 || a.Type === 1));
        let quizScore = 0;
        if (quizAssessments.length > 0) {
            const scores = quizAssessments.map(a => {
                const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (a.id || a.Id));
                return g ? (g.marksObtained || g.MarksObtained || 0) : 0;
            });
            scores.sort((a, b) => b - a);
            const pickCount = data.policy.includes('Best 3') ? 3 : 2;
            const actualToPick = Math.min(scores.length, pickCount);
            quizScore = scores.slice(0, actualToPick).reduce((a, b) => a + b, 0) / (actualToPick || 1);
        }

        // 2. Attendance
        const attdAss = assessments.find(a => (a.type === 0 || a.Type === 0));
        let attdScore = 0;
        if (attdAss) {
            const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (attdAss.id || attdAss.Id));
            attdScore = g ? (g.marksObtained || g.MarksObtained || 0) : 0;
        }

        // 3. Final
        const finalAss = assessments.find(a => (a.type === 3 || a.Type === 3));
        let finalScore = 0;
        if (finalAss) {
            const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (finalAss.id || finalAss.Id));
            finalScore = g ? (g.marksObtained || g.MarksObtained || 0) : 0;
        }

        return {
            attendance: attdScore.toFixed(2),
            quizzes: quizScore.toFixed(2),
            final: finalScore.toFixed(2),
            total: Math.min(quizScore + attdScore + finalScore, 100).toFixed(2)
        };
    };

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
                <h2>Course Gradebook: {courseId}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        className="form-input"
                        value={data.policy}
                        onChange={e => handlePolicyChange(e.target.value)}
                    >
                        <option>Best 2 of 3 Quizzes</option>
                        <option>Best 3 of 4 Quizzes</option>
                    </select>
                    <button onClick={() => setShowAddModal(true)} className="btn-approve">+ Add Column</button>
                </div>
            </div>

            {/* Step 1: Mark Entry */}
            <div className="user-info-card" style={{ marginTop: 20 }}>
                <h3>Step 1: Mark Entry Spreadsheet</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                {(data.assessments || []).map(a => (
                                    <th key={a.id || a.Id}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {a.title || a.Title}
                                            <button
                                                onClick={() => handleDeleteColumn(a.id || a.Id)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 8 }}
                                                title="Delete column"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.enrollments || []).map(e => (
                                <tr key={e.studentId}>
                                    <td>{e.student?.name}</td>
                                    {(data.assessments || []).map(a => {
                                        const g = (data.grades || []).find(gr => (gr.assessmentId || gr.AssessmentId) === (a.id || a.Id) && (gr.studentId || gr.StudentId) === e.studentId);
                                        const isAuto = (a.type === 0 || a.Type === 0);
                                        return (
                                            <td key={a.id || a.Id}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{
                                                        width: '60px',
                                                        textAlign: 'center',
                                                        backgroundColor: isAuto ? '#f8f9fa' : 'white'
                                                    }}
                                                    readOnly={isAuto}
                                                    defaultValue={g ? (g.marksObtained || g.MarksObtained) : ''}
                                                    onBlur={ev => isAuto ? null : updateMark(e.studentId, (a.id || a.Id), ev.target.value)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Step 2: Promotion Engine */}
            <div className="admin-section" style={{ marginTop: 30 }}>
                <h3>Step 2: Promotion Engine</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Student</th>
                            <th>Attendance (10)</th>
                            <th>Quizzes (20)</th>
                            <th>Final (70)</th>
                            <th>Total Weighted Score</th>
                            <th>Status</th>
                            <th>Behavior</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.enrollments || []).map(e => {
                            const stats = calculateStats(e.studentId);
                            return (
                                <tr key={e.studentId}>
                                    <td style={{ textAlign: 'left', fontWeight: '500' }}>{e.student?.name}</td>
                                    <td>{stats.attendance}</td>
                                    <td>{stats.quizzes}</td>
                                    <td>{stats.final}</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.total}%</td>
                                    <td>
                                        <span className={parseFloat(stats.total) >= 40 ? 'status-regular' : 'status-irregular'}>
                                            {parseFloat(stats.total) >= 40 ? 'PASS' : 'FAIL'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => handleOpenRateModal(e)} className="btn-action" style={{ backgroundColor: '#f39c12' }}>⭐ Rate</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Evaluation Modal */}
            {selectedEnrollment && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
                    <div className="user-info-card" style={{ width: '400px' }}>
                        <h3>Rate Soft Skills: {selectedEnrollment.student.name}</h3>
                        <div style={{ marginBottom: 15 }}>
                            <label>Discipline (1-5)</label>
                            <input type="number" min="1" max="5" className="form-input" style={{ width: '100%' }} value={softSkills.discipline} onChange={e => setSoftSkills({ ...softSkills, discipline: parseInt(e.target.value) })} />
                        </div>
                        <div style={{ marginBottom: 15 }}>
                            <label>Participation (1-5)</label>
                            <input type="number" min="1" max="5" className="form-input" style={{ width: '100%' }} value={softSkills.participation} onChange={e => setSoftSkills({ ...softSkills, participation: parseInt(e.target.value) })} />
                        </div>
                        <div style={{ marginBottom: 15 }}>
                            <label>Collaboration (1-5)</label>
                            <input type="number" min="1" max="5" className="form-input" style={{ width: '100%' }} value={softSkills.collaboration} onChange={e => setSoftSkills({ ...softSkills, collaboration: parseInt(e.target.value) })} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleSaveSoftSkills} className="btn-approve" style={{ flex: 1 }}>Save Ratings</button>
                            <button onClick={() => setSelectedEnrollment(null)} className="btn-action" style={{ flex: 1, backgroundColor: 'gray' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Column Modal */}
            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="user-info-card" style={{ width: '400px' }}>
                        <h3>Define Assessment</h3>
                        <label>Title</label>
                        <input className="form-input" style={{ width: '100%', marginBottom: 15 }} placeholder="e.g. Quiz 1" onChange={e => setNewCol({ ...newCol, title: e.target.value })} />
                        <label>Category</label>
                        <select className="form-input" style={{ width: '100%', marginBottom: 15 }} onChange={e => setNewCol({ ...newCol, type: parseInt(e.target.value) })}>
                            <option value={1}>Quiz (20%)</option>
                            <option value={0}>Attendance (10%)</option>
                            <option value={3}>Final Exam (70%)</option>
                        </select>
                        <label>Max Marks</label>
                        <input type="number" className="form-input" style={{ width: '100%', marginBottom: 15 }} placeholder="20" onChange={e => setNewCol({ ...newCol, maxMarks: parseFloat(e.target.value) })} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleAddColumn} className="btn-approve" style={{ flex: 1 }}>Create Column</button>
                            <button onClick={() => setShowAddModal(false)} className="btn-action" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gradebook;