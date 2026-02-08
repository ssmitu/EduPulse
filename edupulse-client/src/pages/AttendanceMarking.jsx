import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

const AttendanceMarking = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_BASE = "https://localhost:7096/api";

    // ✅ Cleaned Hook 1
    useEffect(() => {
        const fetchStudents = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(`${API_BASE}/Courses/${courseId}/students`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStudents(res.data);
                const initialData = {};
                res.data.forEach(s => initialData[s.studentId] = true);
                setAttendanceData(initialData);
            } catch (err) {
                console.error("Error fetching students:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [courseId]);

    // ✅ Cleaned Hook 2
    useEffect(() => {
        const fetchExistingRecords = async () => {
            if (students.length === 0) return;
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(`${API_BASE}/Attendance/course/${courseId}/date/${date}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.length > 0) {
                    const existingData = {};
                    res.data.forEach(record => {
                        existingData[record.studentId] = record.isPresent;
                    });
                    setAttendanceData(existingData);
                } else {
                    const resetData = {};
                    students.forEach(s => resetData[s.studentId] = true);
                    setAttendanceData(resetData);
                }
            } catch (err) {
                console.error("Error fetching existing records:", err);
            }
        };
        fetchExistingRecords();
    }, [date, courseId, students]);

    const handleStatusChange = (studentId, isPresent) => {
        setAttendanceData(prev => ({ ...prev, [studentId]: isPresent }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        const payload = {
            courseId: parseInt(courseId),
            date: date,
            students: Object.keys(attendanceData).map(id => ({
                studentId: parseInt(id),
                isPresent: attendanceData[id]
            }))
        };

        try {
            await axios.post(`${API_BASE}/Attendance/mark`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Attendance saved successfully!");
            navigate(-1);
        } catch (err) {
            console.error("Error saving attendance:", err);
            alert("Error saving records.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="dashboard-container">Loading...</div>;

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
                <h2>{searchParams.get('date') ? "Edit Attendance" : "Mark Attendance"}</h2>
                <div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="btn-action"
                        style={{ background: 'white', color: 'black' }}
                    />
                </div>
            </div>

            <div className="user-info-card" style={{ marginTop: '20px' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.studentId}>
                                <td>{student.name}</td>
                                <td>
                                    <label style={{ marginRight: '15px', color: attendanceData[student.studentId] ? 'green' : 'black', fontWeight: attendanceData[student.studentId] ? 'bold' : 'normal' }}>
                                        <input
                                            type="radio"
                                            name={`status-${student.studentId}`}
                                            checked={attendanceData[student.studentId] === true}
                                            onChange={() => handleStatusChange(student.studentId, true)}
                                        /> Present
                                    </label>
                                    <label style={{ color: attendanceData[student.studentId] === false ? 'red' : 'black', fontWeight: attendanceData[student.studentId] === false ? 'bold' : 'normal' }}>
                                        <input
                                            type="radio"
                                            name={`status-${student.studentId}`}
                                            checked={attendanceData[student.studentId] === false}
                                            onChange={() => handleStatusChange(student.studentId, false)}
                                        /> Absent
                                    </label>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button
                        onClick={handleSubmit}
                        className="btn-action"
                        disabled={saving}
                        style={{ backgroundColor: '#28a745', padding: '10px 30px' }}
                    >
                        {saving ? "Saving..." : "Submit Attendance"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceMarking;