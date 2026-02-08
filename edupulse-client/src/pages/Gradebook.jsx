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

    // 2. Refresh Trigger (Fixes the ESLint Error)
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
    const token = localStorage.getItem('token');

    // 3. MAIN DATA FETCHING EFFECT
    // This runs whenever 'courseId' changes OR 'refreshKey' changes
    useEffect(() => {
        const fetchAllData = async () => {
            const localToken = localStorage.getItem('token');
            if (!localToken) return;

            const config = { headers: { Authorization: `Bearer ${localToken}` } };
            try {
                const res = await axios.get(`${API_BASE}/Grades/course/${courseId}`, config);

                // Debugging: Log the exact data coming from backend
                console.log("Backend Response:", res.data);

                // Handle Capital vs Small letter mismatch safely
                const rawStudents = res.data.students || res.data.Students || [];
                const rawAssessments = res.data.assessments || res.data.Assessments || [];
                const rawGrades = res.data.grades || res.data.Grades || [];
                const rawPolicy = res.data.policy || res.data.Policy || 'Best 2 of 3 Quizzes';

                setData({
                    assessments: rawAssessments,
                    grades: rawGrades,
                    // Robust mapping: Checks for both s.studentId (camel) and s.StudentId (Pascal)
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
    }, [courseId, refreshKey]); // ✅ Safe dependency array

    // --- HANDLER TO SAVE SOFT SKILLS ---
    const handleSaveSoftSkills = async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/SoftSkills/upsert`, {
                studentId: selectedEnrollment.studentId,
                courseId: parseInt(courseId),
                discipline: softSkills.discipline,
                participation: softSkills.participation,
                collaboration: softSkills.collaboration
            }, config);

            alert(`Soft skills saved for ${selectedEnrollment.student.name}`);
            setSelectedEnrollment(null);
            setSoftSkills({ discipline: 3, participation: 3, collaboration: 3 });
        } catch (error) {
            console.error("Save error:", error);
            alert("Error saving soft skills. Check console.");
        }
    };

    // 4. CHANGE GRADING POLICY
    const handlePolicyChange = async (newPolicy) => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments/course/${courseId}/policy`, { policy: newPolicy }, config);
            setData(prev => ({ ...prev, policy: newPolicy }));
        } catch {
            alert("Failed to update policy");
        }
    };

    // 5. DELETE COLUMN
    const handleDeleteColumn = async (id) => {
        if (!window.confirm("Delete this column and all its marks?")) return;

        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.delete(`${API_BASE}/Assessments/${id}`, config);
            // Trigger a re-fetch
            setRefreshKey(old => old + 1);
        } catch {
            alert("Delete failed.");
        }
    };

    // 6. ADD COLUMN
    const handleAddColumn = async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments`,
                { ...newCol, weightage: 0, courseId: parseInt(courseId) },
                config
            );
            setShowAddModal(false);
            // Trigger a re-fetch
            setRefreshKey(old => old + 1);
        } catch {
            alert("Error adding column");
        }
    };

    // 7. UPDATE MARKS
    const updateMark = async (studentId, assessmentId, mark) => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const numericMark = parseFloat(mark) || 0;

        setData(prev => {
            const gradesList = prev.grades || [];
            // Check carefully for matching IDs (handling case sensitivity)
            const exists = gradesList.some(g => (g.studentId || g.StudentId) === studentId && (g.assessmentId || g.AssessmentId) === assessmentId);

            let newGrades;
            if (exists) {
                newGrades = gradesList.map(g =>
                    ((g.studentId || g.StudentId) === studentId && (g.assessmentId || g.AssessmentId) === assessmentId)
                        ? { ...g, marksObtained: numericMark }
                        : g
                );
            } else {
                newGrades = [...gradesList, { studentId, assessmentId, marksObtained: numericMark }];
            }
            return { ...prev, grades: newGrades };
        });

        try {
            await axios.post(`${API_BASE}/Grades/bulk-update`,
                [{ studentId, assessmentId, marksObtained: numericMark }],
                config
            );
        } catch (error) {
            console.error("Mark update failed", error);
        }
    };

    // 8. CALCULATE STATS
    const calculateStats = (studentId) => {
        // Safe access to properties
        const studentGrades = (data.grades || []).filter(g => (g.studentId || g.StudentId) === studentId);
        const quizAssessments = (data.assessments || []).filter(a => (a.type || a.Type) === 1);

        let quizScore = 0;
        if (quizAssessments.length > 0) {
            const scores = quizAssessments.map(a => {
                const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (a.id || a.Id));
                // Handle property casing for MarksObtained
                const marks = g ? (g.marksObtained !== undefined ? g.marksObtained : g.MarksObtained) : 0;
                return parseFloat(marks) || 0;
            });
            scores.sort((a, b) => b - a);
            const pickCount = data.policy?.includes('Best 3') ? 3 : 2;
            const sum = scores.slice(0, pickCount).reduce((acc, val) => acc + val, 0);
            quizScore = sum / (quizAssessments.length > 0 ? pickCount : 1);
        }

        let attdScore = 0;
        const attd = (data.assessments || []).find(a => (a.type || a.Type) === 0);
        if (attd) {
            const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (attd.id || attd.Id));
            const marks = g ? (g.marksObtained !== undefined ? g.marksObtained : g.MarksObtained) : 0;
            attdScore = parseFloat(marks) || 0;
        }

        let finalScore = 0;
        const final = (data.assessments || []).find(a => (a.type || a.Type) === 3);
        if (final) {
            const g = studentGrades.find(gr => (gr.assessmentId || gr.AssessmentId) === (final.id || final.Id));
            const marks = g ? (g.marksObtained !== undefined ? g.marksObtained : g.MarksObtained) : 0;
            finalScore = parseFloat(marks) || 0;
        }

        const total = quizScore + attdScore + finalScore;
        return {
            attendance: attdScore.toFixed(2),
            quizzes: quizScore.toFixed(2),
            final: finalScore.toFixed(2),
            total: Math.min(total, 100).toFixed(2)
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
                                            {a.title || a.Title} {(a.type || a.Type) === 0 && "(Auto)"}
                                            <button onClick={() => handleDeleteColumn(a.id || a.Id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 5 }}>🗑️</button>
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
                                        const aId = a.id || a.Id;
                                        const aType = a.type !== undefined ? a.type : a.Type;

                                        const g = (data.grades || []).find(gr => (gr.assessmentId || gr.AssessmentId) === aId && (gr.studentId || gr.StudentId) === e.studentId);
                                        const isAttendance = aType === 0;
                                        const marks = g ? (g.marksObtained !== undefined ? g.marksObtained : g.MarksObtained) : '';

                                        return (
                                            <td key={aId}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{
                                                        width: '60px',
                                                        textAlign: 'center',
                                                        backgroundColor: isAttendance ? '#e9ecef' : 'white',
                                                        cursor: isAttendance ? 'not-allowed' : 'text'
                                                    }}
                                                    value={marks}
                                                    readOnly={isAttendance}
                                                    onChange={ev => isAttendance ? null : updateMark(e.studentId, aId, ev.target.value)}
                                                    onBlur={ev => isAttendance ? null : updateMark(e.studentId, aId, ev.target.value)}
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

            {/* --- EVALUATION MODAL --- */}
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
                                    <td style={{ color: '#555' }}>{stats.attendance}</td>
                                    <td style={{ color: '#555' }}>{stats.quizzes}</td>
                                    <td style={{ color: '#555' }}>{stats.final}</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2c3e50' }}>{stats.total}%</td>
                                    <td>
                                        <span className={parseFloat(stats.total) >= 40 ? 'status-regular' : 'status-irregular'}>
                                            {parseFloat(stats.total) >= 40 ? 'PASS' : 'FAIL'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => setSelectedEnrollment(e)}
                                            className="btn-action"
                                            style={{ backgroundColor: '#f39c12', padding: '5px 10px' }}
                                        >
                                            ⭐ Rate
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="user-info-card" style={{ width: '400px' }}>
                        <h3>Define Assessment</h3>
                        <label>Title</label>
                        <input className="form-input" style={{ width: '100%', marginBottom: 15 }} placeholder="e.g. Quiz 1" onChange={e => setNewCol({ ...newCol, title: e.target.value })} />
                        <label>Category</label>
                        <select className="form-input" style={{ width: '100%', marginBottom: 15 }} onChange={e => setNewCol({ ...newCol, type: parseInt(e.target.value) })}>
                            <option value={1}>Quiz / Assignment (Part of 20%)</option>
                            <option value={0}>Attendance (Part of 10%)</option>
                            <option value={3}>Final Exam (Part of 70%)</option>
                        </select>
                        <label>Max Marks</label>
                        <input type="number" className="form-input" style={{ width: '100%', marginBottom: 15 }} placeholder="e.g. 20" onChange={e => setNewCol({ ...newCol, maxMarks: parseFloat(e.target.value) })} />
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