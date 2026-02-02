import { useState, useEffect, useContext } from 'react';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TeacherCourses = () => {
    const { user } = useContext(AuthContext);
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ title: '', code: '', targetDeptId: '', year: '', semester: '' });
    const [departments, setDepartments] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
        API.get('/Departments').then(res => setDepartments(res.data));
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await API.get('/Courses');
            setCourses(res.data);
        } catch (err) {
            console.error("Error fetching courses", err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post('/Courses', newCourse);
            alert("Course Created!");
            setNewCourse({ title: '', code: '', targetDeptId: '', year: '', semester: '' }); // Clear form
            fetchCourses();
        } catch (err) {
            alert("Error creating course");
        }
    };

    const handleSync = async (id) => {
        try {
            const res = await API.post(`/Courses/sync/${id}`);
            alert(res.data.message);
        } catch (err) {
            alert("Sync failed");
        }
    };

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <button onClick={() => navigate('/dashboard')} className="btn-action">← Back to Dashboard</button>
                <h2>Manage Your Courses</h2>
            </div>

            <form onSubmit={handleCreate} className="user-info-card" style={{ marginBottom: '30px' }}>
                <h3 style={{ marginTop: 0 }}>Create New Course</h3>
                <input placeholder="Course Title" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} required className="form-input" />
                <input placeholder="Course Code" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} required className="form-input" />

                <select value={newCourse.targetDeptId} onChange={e => setNewCourse({ ...newCourse, targetDeptId: e.target.value })} required className="form-input">
                    <option value="">Select Target Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" placeholder="Year" value={newCourse.year} onChange={e => setNewCourse({ ...newCourse, year: e.target.value })} required className="form-input" />
                    <input type="number" placeholder="Semester" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required className="form-input" />
                </div>
                <button type="submit" className="btn-approve">Create Course</button>
            </form>

            <div className="admin-section">
                <h3>Your Active Courses</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Title</th>
                            <th>Target Audience</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(c => (
                            <tr key={c.id}>
                                <td>{c.code}</td>
                                <td>{c.title}</td>
                                <td>{c.deptName} (Y{c.year} S{c.semester})</td>
                                <td>
                                    <button onClick={() => handleSync(c.id)} className="btn-approve">
                                        Sync Batch
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherCourses;