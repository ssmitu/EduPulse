import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'Student',
        departmentId: '', year: '', semester: '', verificationKey: ''
    });
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch departments for the dropdown
        API.get('/Departments').then(res => setDepartments(res.data));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await API.post('/Auth/register', formData);
            alert("Registration Successful! You can now login.");
            navigate('/login');
        } catch (err) {
            setError(err.response?.data || "Registration failed.");
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
            <form onSubmit={handleSubmit} style={{ width: '400px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h2>EduPulse Sign Up</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <input placeholder="Full Name" onChange={e => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
                <input type="email" placeholder="Email" onChange={e => setFormData({ ...formData, email: e.target.value })} required style={inputStyle} />
                <input type="password" placeholder="Password" onChange={e => setFormData({ ...formData, password: e.target.value })} required style={inputStyle} />

                <label>Role:</label>
                <select onChange={e => setFormData({ ...formData, role: e.target.value })} style={inputStyle}>
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                </select>

                <label>Department:</label>
                <select onChange={e => setFormData({ ...formData, departmentId: e.target.value })} required style={inputStyle}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>

                {/* Conditional Fields for Students */}
                {formData.role === 'Student' && (
                    <>
                        <input type="number" placeholder="Year (1-4)" min="1" max="4" onChange={e => setFormData({ ...formData, year: e.target.value })} required style={inputStyle} />
                        <input type="number" placeholder="Semester (1-2)" min="1" max="2" onChange={e => setFormData({ ...formData, semester: e.target.value })} required style={inputStyle} />
                    </>
                )}

                {/* Conditional Field for Teachers */}
                {formData.role === 'Teacher' && (
                    <input type="password" placeholder="Departmental Secret Key" onChange={e => setFormData({ ...formData, verificationKey: e.target.value })} required style={inputStyle} />
                )}

                <button type="submit" style={btnStyle}>Sign Up</button>
            </form>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '8px', marginBottom: '15px', display: 'block' };
const btnStyle = { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default Register;