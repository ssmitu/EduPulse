import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee' }}>
                <h1>EduPulse Dashboard</h1>
                <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Logout
                </button>
            </div>

            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', color: 'black' }}>
                <h2>Welcome, {user.name}!</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Department:</strong> {user.department}</p>

                {user.role === 'Student' && (
                    <p><strong>Current Standing:</strong> Year {user.year}, Semester {user.semester}</p>
                )}
            </div>

            <div style={{ marginTop: '20px' }}>
                {/* We will add role-specific buttons here in the next step */}
                {user.role === 'Admin' && <button style={actionBtn}>Manage Teachers</button>}
                {user.role === 'Teacher' && <button style={actionBtn}>Create New Course</button>}
                {user.role === 'Student' && <button style={actionBtn}>View My Grades</button>}
            </div>
        </div>
    );
};

const actionBtn = { padding: '15px 30px', margin: '10px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #007bff', backgroundColor: 'white', color: '#007bff' };

export default Dashboard;