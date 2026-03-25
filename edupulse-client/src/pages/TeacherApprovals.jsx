import React, { useState, useEffect } from 'react';
import API from '../api/axios';

const TeacherApprovals = () => {
    const [pendingTeachers, setPendingTeachers] = useState([]);

    const approveTeacher = async (id) => {
        try {
            await API.post(`/Auth/approve-teacher/${id}`);
            setPendingTeachers(prev => prev.filter(t => t.id !== id));
            alert('Teacher Approved Successfully!');
        } catch (error) {
            alert('Approval failed.');
        }
    };

    useEffect(() => {
        API.get('/Auth/pending-teachers')
            .then(res => setPendingTeachers(res.data))
            .catch(err => console.error('Failed to fetch teachers:', err));
    }, []);

    return (
        <div className="admin-container" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <div className="admin-section-card" style={{ background: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h3 style={{ color: '#2d6a4f', marginTop: 0, borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
                    Pending Teacher Registrations
                </h3>
                {pendingTeachers.length === 0 ? (
                    <p style={{ color: '#888', fontStyle: 'italic', padding: '20px 0' }}>
                        No teachers are currently waiting for approval.
                    </p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingTeachers.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: '600' }}>{t.name}</td>
                                    <td>{t.email}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => approveTeacher(t.id)} className="btn-approve">
                                            Approve Teacher
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TeacherApprovals;