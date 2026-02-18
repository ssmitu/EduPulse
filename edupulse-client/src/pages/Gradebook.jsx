import React, { useState, useEffect } from 'react'; // Removed useMemo
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const Gradebook = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();

    // 1. Data States
    const [assessments, setAssessments] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [grades, setGrades] = useState([]);
    const [policy, setPolicy] = useState('Best 2 of 3 Quizzes');
    const [loading, setLoading] = useState(true);

    // 2. UI States
    const [refreshKey, setRefreshKey] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCol, setNewCol] = useState({ title: '', type: 1, maxMarks: 20 });

    const API_BASE = "https://localhost:7096/api";

    // 3. MAIN DATA FETCHING
    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                const res = await axios.get(`${API_BASE}/Grades/course/${courseId}`, config);

                const rawStudents = res.data.students || res.data.Students || [];
                const rawAssessments = res.data.assessments || res.data.Assessments || [];
                const rawGrades = res.data.grades || res.data.Grades || [];

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

            if (existingIndex > -1) {
                const newGrades = [...prev];
                newGrades[existingIndex] = { ...newGrades[existingIndex], marksObtained: numericValue };
                return newGrades;
            } else {
                return [...prev, { studentId, assessmentId, marksObtained: numericValue }];
            }
        });
    };

    const saveMarkToServer = async (studentId, assessmentId, value) => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const numericValue = value === "" ? 0 : parseFloat(value);

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
                [{ studentId, assessmentId, marksObtained: numericValue }],
                config
            );
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save to server.");
            setRefreshKey(old => old + 1);
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Gradebook...</div>;

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
                <h2>Course Gradebook: {courseId}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="form-input" value={policy} onChange={e => setPolicy(e.target.value)}>
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
                                            {a.title || a.Title}
                                            <button
                                                onClick={() => handleDeleteColumn(a.id || a.Id)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 8 }}
                                            >🗑️</button>
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
                                                    style={{ width: '60px', textAlign: 'center', backgroundColor: isAuto ? '#f8f9fa' : 'white' }}
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
                        </tr>
                    </thead>
                    <tbody>
                        {(data.enrollments || []).map(e => {
                            const stats = calculateStats(e.studentId);
                            return (
                                <tr key={e.studentId}>
                                    <td style={{ textAlign: 'left', fontWeight: '500' }}>{e.name}</td>
                                    <td>{stats.attendance}</td>
                                    <td>{stats.quizzes}</td>
                                    <td>{stats.final}</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.total}%</td>
                                    <td>
                                        <span className={parseFloat(stats.total) >= 40 ? 'status-regular' : 'status-irregular'}>
                                            {parseFloat(stats.total) >= 40 ? 'PASS' : 'FAIL'}
                                        </span>
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
                            <option value={1}>Quiz (20%)</option>
                            <option value={0}>Attendance (10%)</option>
                            <option value={3}>Final Exam (70%)</option>
                        </select>
                        <label>Max Marks</label>
                        <input type="number" className="form-input" style={{ width: '100%', marginBottom: 15 }} placeholder="20" onChange={e => setNewCol({ ...newCol, maxMarks: parseFloat(e.target.value) })} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={async () => {
                                try {
                                    await axios.post(`${API_BASE}/Assessments`, { ...newCol, date: new Date().toISOString(), weightage: 0, courseId: parseInt(courseId) }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                    setShowAddModal(false);
                                    setRefreshKey(k => k + 1);
                                } catch (err) { console.error(err); alert("Error adding column"); }
                            }} className="btn-approve" style={{ flex: 1 }}>Create Column</button>
                            <button onClick={() => setShowAddModal(false)} className="btn-action" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Gradebook;