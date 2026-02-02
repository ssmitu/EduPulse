import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

const CourseDetails = () => {
    const { id } = useParams();
    const [students, setStudents] = useState([]);
    const [manualEmail, setManualEmail] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await API.get(`/Courses/${id}/students`);
                setStudents(res.data);
            } catch (err) {
                console.error("Error fetching students", err);
            }
        };

        fetchStudents();
    }, [id]);

    const handleManualEnroll = async (e) => {
        e.preventDefault();
        try {
            await API.post(
                `/Courses/${id}/enroll-manual`,
                `"${manualEmail}"`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            alert("Student Added!");
            setManualEmail('');

            // Refresh student list
            const res = await API.get(`/Courses/${id}/students`);
            setStudents(res.data);
        } catch (err) {
            alert(err.response?.data || "Enrollment failed");
        }
    };

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate('/teacher-courses')} className="btn-action">
                    ← Back to Courses
                </button>
                <h2>Course Enrollment List</h2>
            </div>

            <form
                onSubmit={handleManualEnroll}
                className="user-info-card"
                style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}
            >
                <input
                    placeholder="Student Email (@aust.edu)"
                    className="form-input"
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    required
                />
                <button type="submit" className="btn-approve" style={{ width: '200px' }}>
                    Add Irregular Student
                </button>
            </form>

            <div className="admin-section">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(s => (
                            <tr key={s.studentId}>
                                <td>{s.name}</td>
                                <td>{s.email}</td>
                                <td style={{ color: s.status === 'Regular' ? '#28a745' : '#ffc107' }}>
                                    {s.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CourseDetails;
