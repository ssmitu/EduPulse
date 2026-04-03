import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const TeacherProfile = () => {
    const { user } = useContext(AuthContext);

    // Safety check if user data isn't loaded yet
    if (!user) return <div className="dashboard-container">Loading Faculty Data...</div>;

    return (
        <div className="dashboard-container">
            {/* Professional Header */}
            <div className="header-strip">
                <h2 style={{ color: '#1b4332' }}>Faculty Identity Portal</h2>
                <div className="portal-tag">Official Teacher Access</div>
            </div>

            <div className="iums-home-container" style={{ paddingTop: '10px' }}>
                <div className="iums-home-card" style={{
                    borderTop: '10px solid #1b4332',
                    borderRadius: '15px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {/* Faculty Avatar Section */}
                    <div className="iums-avatar-section">
                        <div className="iums-green-circle" style={{ backgroundColor: '#1b4332' }}>
                            <span style={{ fontSize: '70px' }}>👨‍🏫</span>
                        </div>
                    </div>

                    <h2 style={{
                        textAlign: 'center',
                        color: '#1b4332',
                        marginBottom: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {user.name}
                    </h2>
                    <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontWeight: '500' }}>
                        {user.department} Faculty Member
                    </p>

                    {/* Faculty Details Table */}
                    <table className="iums-display-table">
                        <tbody>
                            <tr>
                                <td className="iums-label">Teacher ID</td>
                                <td className="iums-value" style={{ fontWeight: 'bold', color: '#1b4332' }}>
                                    {user.email ? user.email.split('@')[0] : 'N/A'}
                                </td>
                            </tr>
                            <tr>
                                <td className="iums-label">Primary Department</td>
                                <td className="iums-value">{user.department || "General Science & Engineering"}</td>
                            </tr>
                            <tr>
                                <td className="iums-label">Designation</td>
                                <td className="iums-value">Lecturer / Course Instructor</td>
                            </tr>
                            <tr>
                                <td className="iums-label">Official Email</td>
                                <td className="iums-value">{user.email}</td>
                            </tr>
                            <tr>
                                <td className="iums-label">Verification</td>
                                <td className="iums-value">
                                    <span className="iums-success-text" style={{ color: '#27ae60', fontWeight: 'bold' }}>
                                        ✓ Verified Academic Staff
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Professional Footer */}
                <div className="iums-card-footer" style={{ marginTop: '30px' }}>
                    <p style={{ fontWeight: 'bold', color: '#444' }}>Ahsanullah University of Science and Technology</p>
                    <p>© 2026 EduPulse Academic Performance Tracker</p>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfile;