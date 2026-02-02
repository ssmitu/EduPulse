import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const navigate = useNavigate();

    const approveTeacher = async (id) => {
        try {
            await API.post(`/Auth/approve-teacher/${id}`);
            setPendingTeachers(prev => prev.filter(t => t.id !== id));
            alert("Teacher Approved Successfully!");
        } catch (error) {
            console.error(error);
            alert("Approval failed.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        if (user?.role !== 'Admin') return;

        let isMounted = true;

        const fetchPendingTeachers = async () => {
            try {
                const response = await API.get('/Auth/pending-teachers');
                if (isMounted) {
                    setPendingTeachers(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch teachers:", error);
            }
        };

        fetchPendingTeachers();

        return () => {
            isMounted = false;
        };
    }, [user]);

    if (!user) {
        return <div className="dashboard-container">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <h1>EduPulse</h1>
                <button onClick={handleLogout} className="btn-logout">
                    Logout
                </button>
            </div>

            <div className="user-info-card">
                <h2>Welcome, {user.name}!</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Department:</strong> {user.department}</p>

                {user.role === 'Student' && (
                    <p>
                        <strong>Standing:</strong> Year {user.year}, Semester {user.semester}
                    </p>
                )}
            </div>

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

            <div className="action-area">
                {user.role === 'Teacher' && (
                    <button
                        className="btn-action"
                        onClick={() => navigate('/teacher-courses')}
                    >
                        Manage My Courses
                    </button>
                )}

                {user.role === 'Student' && (
                    <button className="btn-action">
                        View My Grades
                    </button>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
