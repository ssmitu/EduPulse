import { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const TeacherCourses = () => {
    useContext(AuthContext);
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({
        title: '',
        code: '',
        targetDeptId: '',
        year: '',
        semester: ''
    });
    const [departments, setDepartments] = useState([]);
    const navigate = useNavigate();

    const location = useLocation();
    const isGradingMode = new URLSearchParams(location.search).get('mode') === 'grading';

    const fetchCourses = async () => {
        try {
            const res = await API.get('/Courses');
            setCourses(res.data);
        } catch (err) {
            console.error("Error fetching courses", err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const coursesRes = await API.get('/Courses');
                setCourses(coursesRes.data);

                const departmentsRes = await API.get('/Departments');
                setDepartments(departmentsRes.data);
            } catch (err) {
                console.error("Error loading data", err);
            }
        };
        loadData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post('/Courses', newCourse);
            alert("Course Instance Created!");
            setNewCourse({ title: '', code: '', targetDeptId: '', year: '', semester: '' });
            fetchCourses();
        } catch {
            alert("Error creating course");
        }
    };

    const handleSync = async (id) => {
        try {
            const res = await API.post(`/Courses/sync/${id}`);
            alert(res.data.message);
        } catch {
            alert("Sync failed");
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header Area */}
            <div className="header-strip">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-action" style={{ backgroundColor: '#52796f', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ← Dashboard
                    </button>
                    <h2 style={{ color: '#1b4332', margin: 0 }}>
                        {isGradingMode ? "Grading & Evaluation" : "Academic Course Management"}
                    </h2>
                </div>
            </div>

            {/* Registration Form - Simplified grid */}
            {!isGradingMode && (
                <div className="user-info-card" style={{ marginBottom: '40px', borderLeft: '8px solid #1b4332' }}>
                    <h3 style={{ color: '#1b4332', marginBottom: '20px' }}>Register New Course Instance</h3>
                    <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', gap: '15px' }}>
                        <input placeholder="Course Title" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} required className="form-input" />
                        <input placeholder="Course Code" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} required className="form-input" />
                        <select value={newCourse.targetDeptId} onChange={e => setNewCourse({ ...newCourse, targetDeptId: e.target.value })} required className="form-input">
                            <option value="">Select Target Dept</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="number" placeholder="Y" value={newCourse.year} onChange={e => setNewCourse({ ...newCourse, year: e.target.value })} required className="form-input" />
                            <input type="number" placeholder="S" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required className="form-input" />
                        </div>
                        <button type="submit" className="btn-primary" style={{ gridColumn: 'span 4', marginTop: '10px' }}>+ Initialize Course</button>
                    </form>
                </div>
            )}

            {/* Course Card Grid - CLEAN AND PROFESSIONAL */}
            <div className="courses-grid">
                {courses.length === 0 ? (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: '#999', fontSize: '1.2rem' }}>
                        No active courses found. Use the form above to create one.
                    </p>
                ) : (
                    courses.map(c => (
                        <div key={c.id} className="course-card-pro">
                            {/* Card Top Label */}
                            <div className="course-card-header">
                                <span className="pro-code">{c.code}</span>
                                <span className="pro-tag">{c.deptName} (Year {c.year} Sem {c.semester})</span>
                            </div>

                            <h3 className="pro-title">{c.title}</h3>

                            <div className="pro-actions-container">
                                {isGradingMode ? (
                                    <button onClick={() => navigate(`/course/${c.id}/gradebook`)} className="btn-primary" style={{ backgroundColor: '#6b46c1', width: '100%', padding: '15px' }}>
                                        📊 Open Gradebook & Behavioral Stars
                                    </button>
                                ) : (
                                    <>
                                        {/* Management Group */}
                                        <div className="action-group">
                                            <label>Management</label>
                                            <button onClick={() => navigate(`/course-content/${c.id}`)} className="btn-pro-outline">📚 Materials</button>
                                            <button onClick={() => navigate(`/course-details/${c.id}`)} className="btn-pro-outline">👤 Enrollment</button>
                                            <button onClick={() => handleSync(c.id)} className="btn-pro-outline">🔄 Sync</button>
                                        </div>

                                        {/* Attendance Group */}
                                        <div className="action-group">
                                            <label>Daily Records</label>
                                            <button onClick={() => navigate(`/attendance/${c.id}`)} className="btn-pro-solid">📅 Mark Attendance</button>
                                            <button onClick={() => navigate(`/attendance-sheet/${c.id}`)} className="btn-pro-solid" style={{ backgroundColor: '#17a2b8' }}>📋 Full Sheet</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherCourses;