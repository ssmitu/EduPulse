import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const StudentProfile = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('Personal');

    return (
        <div className="profile-page-container">
            <h2 className="page-title">Student Profile</h2>
            <div className="alert-info">There are some changes in the address section. Please provide your address information.</div>

            <div className="profile-layout-grid">
                <div className="profile-main-tabs">
                    <div className="tab-header">
                        {['Personal', 'Academic', 'Guardian', 'Contact'].map(tab => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="tab-content">
                        <table className="details-table">
                            <tbody>
                                <tr><td className="field-label">Full Name</td><td>{user.name}</td></tr>
                                <tr><td className="field-label">First Name *</td><td><input type="text" defaultValue={user.name?.split(' ')[0]} /></td></tr>
                                <tr><td className="field-label">Last Name</td><td><input type="text" defaultValue={user.name?.split(' ')[1]} /></td></tr>
                                <tr><td className="field-label">Father's Name *</td><td><input type="text" /></td></tr>
                                <tr><td className="field-label">Birth Date *</td><td><input type="date" /></td></tr>
                                <tr><td className="field-label">Gender *</td><td><select><option>M</option><option>F</option></select></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side Mini Info Card */}
                <div className="profile-side-card">
                    <div className="side-avatar-box">👤</div>
                    <div className="side-info-row"><span>Student Id</span><strong>{user.email.split('@')[0]}</strong></div>
                    <div className="side-info-row"><span>Student Name</span><strong>{user.name}</strong></div>
                    <div className="side-info-row"><span>Semester</span><strong>Fall, 2022</strong></div>
                    <div className="side-info-row"><span>Year/Semester</span><strong>{user.year}/{user.semester}</strong></div>
                </div>
            </div>
        </div>
    );
};
export default StudentProfile;