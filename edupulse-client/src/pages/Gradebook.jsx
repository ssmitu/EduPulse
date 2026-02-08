import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const Gradebook = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState({
        assessments: [],
        enrollments: [], // We will map students from the new endpoint here
        grades: [],
        policy: 'Best 2 of 3 Quizzes'
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCol, setNewCol] = useState({ title: '', type: 1, maxMarks: 20 });

    // --- NEW STATE FOR SOFT SKILLS ---
    const [selectedEnrollment, setSelectedEnrollment] = useState(null);
    const [softSkills, setSoftSkills] = useState({
        discipline: 3,
        participation: 3,
        collaboration: 3
    });

    const API_BASE = "https://localhost:7096/api";
    const token = localStorage.getItem('token');

    // 1. DATA FETCHING FUNCTION (Updated to call GradesController)
    // We fetch the token inside here to keep the dependency array stable
    // We fetch the token inside here to keep the dependency array stable
    const refreshData = useCallback(async () => {
        const localToken = localStorage.getItem('token');
        if (!localToken) return;

        const config = { headers: { Authorization: `Bearer ${localToken}` } };
        try {
            // ✅ CHANGED: Now calling the automated Grades endpoint instead of Assessments
            const res = await axios.get(`${API_BASE}/Grades/course/${courseId}`, config);

            // Map the API response to our local state structure
            setData({
                assessments: res.data.assessments,
                grades: res.data.grades,
                enrollments: res.data.students.map(s => ({ studentId: s.studentId, student: { name: s.name } })),
                policy: res.data.policy || 'Best 2 of 3 Quizzes'
            });
        } catch (error) {
            console.error("Fetch error:", error);
        }
    }, [courseId, API_BASE]);

    useEffect(() => {
        const timer = setTimeout(() => {
            refreshData();
        }, 0);
        return () => clearTimeout(timer);
    // --- NEW HANDLER TO SAVE SOFT SKILLS ---
    const handleSaveSoftSkills = async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/SoftSkills/upsert`, {
                enrollmentId: selectedEnrollment.id, // Using e.id from the map
                ...softSkills
            }, config);
            alert(`Soft skills saved for ${selectedEnrollment.student.name}`);
            setSelectedEnrollment(null);
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save soft skills.");
        }
    };

    // 3. CHANGE GRADING POLICY
    // 3. CHANGE GRADING POLICY
    const handlePolicyChange = async (newPolicy) => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments/course/${courseId}/policy`, { policy: newPolicy }, config);
            setData(prev => ({ ...prev, policy: newPolicy }));
        } catch {
            alert("Failed to update policy");
        }
    };

    const handleDeleteColumn = async (id) => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        if (!window.confirm("Delete this column and all its marks?")) return;
            refreshData();
        } catch {
        } catch { // ✅ FIX: Removed unused 'err'
        } catch {
            alert("Delete failed.");
        }
    };

    const handleAddColumn = async () => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post(`${API_BASE}/Assessments`,
                { ...newCol, weightage: 0, courseId: parseInt(courseId) },
                config
            );
            setShowAddModal(false);
            refreshData();
        } catch {
            alert("Error adding column");
        }
    };

    const updateMark = async (studentId, assessmentId, mark) => {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const numericMark = parseFloat(mark) || 0;

        // Optimistic UI update
        setData(prev => {
            const gradesList = prev.grades || [];
            const exists = gradesList.some(g => g.studentId === studentId && g.assessmentId === assessmentId);
            let newGrades;
            if (exists) {
                newGrades = gradesList.map(g =>
                    (g.studentId === studentId && g.assessmentId === assessmentId)
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

    const calculateStats = (studentId) => {
        const studentGrades = (data.grades || []).filter(g => g.studentId === studentId);
        const quizAssessments = (data.assessments || []).filter(a => a.type === 1);

        let quizScore = 0;
        if (quizAssessments.length > 0) {
            const scores = quizAssessments.map(a => {
                const g = studentGrades.find(gr => gr.assessmentId === a.id);
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
            const g = studentGrades.find(gr => gr.assessmentId === attd.id);
            attdScore = g ? (parseFloat(g.marksObtained) || 0) : 0;
        }

        let finalScore = 0;
        const final = (data.assessments || []).find(a => a.type === 3);
        if (final) {
            const g = studentGrades.find(gr => gr.assessmentId === final.id);
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
                                    <th key={a.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {a.title} {a.type === 0 && "(Auto)"}
                                            <button onClick={() => handleDeleteColumn(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 5 }}>🗑️</button>
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
                                        const g = (data.grades || []).find(gr => gr.assessmentId === a.id && gr.studentId === e.studentId);
                                        const isAttendance = a.type === 0;
                                        return (
                                            <td key={a.id}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{
                                                        width: '60px',
                                                        textAlign: 'center',
                                                        backgroundColor: isAttendance ? '#e9ecef' : 'white',
                                                        cursor: isAttendance ? 'not-allowed' : 'text'
                                                    }}
                                                    value={g?.marksObtained ?? ''}
                                                    readOnly={isAttendance} // ✅ Attendance is now read-only
                                                    onChange={ev => isAttendance ? null : updateMark(e.studentId, a.id, ev.target.value)}
                                                    onBlur={ev => isAttendance ? null : updateMark(e.studentId, a.id, ev.target.value)}
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

            {/* --- NEW EVALUATION MODAL --- */}
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
                            <th>Behavior</th> {/* NEW COLUMN */}
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