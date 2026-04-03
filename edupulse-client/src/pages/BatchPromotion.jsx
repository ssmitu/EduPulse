import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BatchPromotion = () => {
    const API_BASE_URL = 'https://localhost:7096/api';

    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [batchData, setBatchData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const navigate = useNavigate();

    // Mapping logic for Year.Semester (1-8 translates to 1.1 - 4.2)
    const academicLevels = [
        { id: 1, label: "Year 1, Semester 1 (1.1)" },
        { id: 2, label: "Year 1, Semester 2 (1.2)" },
        { id: 3, label: "Year 2, Semester 1 (2.1)" },
        { id: 4, label: "Year 2, Semester 2 (2.2)" },
        { id: 5, label: "Year 3, Semester 1 (3.1)" },
        { id: 6, label: "Year 3, Semester 2 (3.2)" },
        { id: 7, label: "Year 4, Semester 1 (4.1)" },
        { id: 8, label: "Year 4, Semester 2 (4.2)" },
    ];

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios.get(`${API_BASE_URL}/Departments`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const data = res.data.$values || res.data;
                if (Array.isArray(data)) setDepartments(data);
            })
            .catch(err => console.error("Error fetching departments", err));
    }, []);

    const handleCheckStatus = async () => {
        if (!selectedDept || !selectedSemester) {
            alert("Please select both Department and Academic Level");
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`${API_BASE_URL}/Promotion/batch-status?departmentId=${selectedDept}&semester=${selectedSemester}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.$values || response.data;
            setBatchData(Array.isArray(data) ? data : []);
            if (Array.isArray(data) && data.length === 0) alert("No students found in this batch.");
        } catch (error) {
            alert("Failed to fetch data.");
        }
        setLoading(false);
    };

    const handlePublish = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently promote eligible students.")) return;

        setPublishing(true);
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/Promotion/publish-results?departmentId=${selectedDept}&semester=${selectedSemester}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Success! Batch promotion completed.");
            navigate('/dashboard');
        } catch (error) {
            alert("Failed to publish results.");
        }
        setPublishing(false);
    };

    return (
        <div className="dashboard-container">
            <div className="header-strip">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-action" style={{ backgroundColor: '#52796f', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>
                        ← Back
                    </button>
                    <h2 style={{ color: '#1b4332', margin: 0 }}>Batch Promotion Engine</h2>
                </div>
                <div className="portal-tag">Admin Access</div>
            </div>

            <div className="user-info-card" style={{ marginBottom: '30px', borderLeft: '8px solid #1b4332' }}>
                <h3 style={{ color: '#1b4332', marginBottom: '20px' }}>Select Academic Level to Process</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr', gap: '20px', alignItems: 'end' }}>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="iums-label">Academic Department</label>
                        <select className="form-input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                            <option value="">-- Select Department --</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="iums-label">Current Academic Level (Year.Semester)</label>
                        <select className="form-input" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                            <option value="">-- Select Level --</option>
                            {academicLevels.map(level => (
                                <option key={level.id} value={level.id}>{level.label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleCheckStatus}
                        disabled={loading}
                        className="btn-primary"
                        style={{ height: '45px', backgroundColor: '#1b4332', fontSize: '0.9rem' }}
                    >
                        {loading ? "Analyzing..." : "🔍 Check Status"}
                    </button>
                </div>
            </div>

            {batchData.length > 0 && (
                <div className="admin-section animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ color: '#1b4332', margin: 0 }}>Analysis for Batch {academicLevels.find(l => l.id == selectedSemester)?.label.split('(')[1].replace(')', '')}</h3>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>Students Scanned: <strong>{batchData.length}</strong></div>
                    </div>

                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th style={{ textAlign: 'center' }}>Current Fails</th>
                                <th style={{ textAlign: 'center' }}>Total Carry</th>
                                <th style={{ textAlign: 'center' }}>Eligibility</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batchData.map((student, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: '600' }}>{student.studentName}</td>
                                    <td style={{ textAlign: 'center', color: student.currentFails > 0 ? '#e74c3c' : '#27ae60' }}>{student.currentFails}</td>
                                    <td style={{ textAlign: 'center' }}>{student.totalActiveCarry}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            backgroundColor: student.eligibleForPromotion ? '#dcfce7' : '#fee2e2',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            color: student.eligibleForPromotion ? '#166534' : '#991b1b',
                                            border: `1px solid ${student.eligibleForPromotion ? '#bbf7d0' : '#fecaca'}`
                                        }}>
                                            {student.eligibleForPromotion ? "ELIGIBLE" : "DROP"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 'bold', color: student.action === "Promote" ? '#2d6a4f' : '#c1121f' }}>
                                            {student.action.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '30px', textAlign: 'right' }}>
                        <button onClick={handlePublish} disabled={publishing} className="btn-primary" style={{ width: 'auto', padding: '15px 40px', backgroundColor: '#27ae60' }}>
                            {publishing ? "Processing..." : "🚀 Execute Batch Promotion"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchPromotion;