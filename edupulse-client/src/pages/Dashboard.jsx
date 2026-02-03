import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [myCourses, setMyCourses] = useState([]); // Renamed for clarity
    const navigate = useNavigate();

    const approveTeacher = async (id) => {
        try {
            await API.post(`/Auth/approve-teacher/${id}`);
            setPendingTeachers(prev => prev.filter(t => t.id !== id));
            alert('Teacher Approved Successfully!');
        } catch (error) {
            console.error(error);
            alert('Approval failed.');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    /* ================= ADMIN EFFECT ================= */
    useEffect(() => {
        if (user?.role !== 'Admin') return;

        let cancelled = false;

        API.get('/Auth/pending-teachers')
            .then(res => {
                if (!cancelled) setPendingTeachers(res.data);
            })
            .catch(err => console.error('Failed to fetch teachers:', err));

        return () => { cancelled = true; };
    }, [user?.role]);

    /* ================= COURSES EFFECT (STUDENT & TEACHER) ================= */
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        if (user.role === 'Teacher' || user.role === 'Student') {
            API.get('/Courses') // Fetch all courses (Teacher: their courses, Student: enrolled courses)
                .then(res => {
                    if (!cancelled) setMyCourses(res.data);
                })
                .catch(err => console.error('Error fetching courses', err));
        }

        return () => { cancelled = true; };
    }, [user]);

    if (!user) {
        return <div className="dashboard-container">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            {/* ================= HEADER ================= */}
            <div className="header-strip">
                <h1>EduPulse</h1>
                <button onClick={handleLogout} className="btn-logout">
                    Logout
                </button>
            </div>

            {/* ================= USER INFO ================= */}
            <div className="user-info-card">
                <h2>Welcome, {user.name}!</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Department:</strong> {user.department}</p>
                {user.role === 'Student' && (
                    <p><strong>Standing:</strong> Year {user.year}, Semester {user.semester}</p>
                )}
            </div>

            {/* ================= ADMIN SECTION ================= */}
            {user.role === 'Admin' && (
                <div className="admin-section">
                    <h3>Pending Teacher Approvals</h3>
                    {pendingTeachers.length === 0 ? (
                        <p>No pending teachers to approve at this time.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTeachers.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.name}</td>
                                        <td>{t.email}</td>
                                        <td>
                                            <button
                                                onClick={() => approveTeacher(t.id)}
                                                className="btn-approve"
                                            >
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ================= COURSES SECTION (STUDENT / TEACHER) ================= */}
            {(user.role === 'Student' || user.role === 'Teacher') && (
                <div style={{ marginTop: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>{user.role === 'Teacher' ? "Courses You Teach" : "Your Enrolled Courses"}</h3>
                        {user.role === 'Teacher' && (
                            <button className="btn-approve" onClick={() => navigate('/teacher-courses')}>
                                + Create/Sync Course
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px',
                        marginTop: '10px'
                    }}>
                        {myCourses.length === 0 ? (
                            <p>No courses found.</p>
                        ) : (
                            myCourses.map(course => (
                                <div
                                    key={course.id}
                                    className="user-info-card"
                                    style={{ cursor: 'pointer', border: '1px solid #ddd', color: 'black', transition: '0.2s' }}
                                    onClick={() => navigate(`/course-content/${course.id}`)}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#ddd'}
                                >
                                    <h4 style={{ color: '#007bff', margin: '0 0 10px 0' }}>{course.code}</h4>
                                    <p><strong>{course.title}</strong></p>
                                    <p style={{ fontSize: '0.8em', color: '#666' }}>
                                        {user.role === 'Teacher' ? `Target: ${course.deptName}` : `Teacher: ${course.teacherName}`}
                                    </p>
                                    <span style={{
                                        fontSize: '0.8em',
                                        padding: '3px 8px',
                                        borderRadius: '10px',
                                        backgroundColor: '#e2f3e5',
                                        color: '#155724'
                                    }}>
                                        Year {course.year} Sem {course.semester}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
