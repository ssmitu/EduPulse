import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
// IMPORT YOUR IMAGE
import austImage from '../assets/aust.jpg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await API.post('/Auth/login', { email, password });
            login(response.data, response.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data || "Login failed. Please try again.");
        }
    };

    return (
        <div className="split-login-container">
            {/* LEFT SIDE: Image Section using the imported austImage */}
            <div
                className="login-image-side"
                style={{ backgroundImage: `url(${austImage})` }}
            >
                <div className="image-overlay"></div>
            </div>

            {/* RIGHT SIDE: Form Section */}
            <div className="login-form-side">
                <div className="login-content-wrapper">

                    {/* University Branding Section */}
                    <div className="iums-header-branding">
                        <div className="iums-logo-box">EP</div>
                        <div className="iums-text-box">
                            <h1 className="iums-main-title">Integrated University Management System</h1>
                            <div className="iums-sub-brand">
                                <span className="iums-acronym">IUMS</span>
                                <span className="iums-for">for</span>
                                <p className="iums-uni-name">EduPulse University of Science and Technology</p>
                            </div>
                        </div>
                    </div>

                    {/* Sign-in Header with the Green Line */}
                    <div className="sign-in-section">
                        <h2 className="sign-in-heading">Sign in with your EduPulse Id</h2>
                        <div className="heading-underline"></div>
                    </div>

                    {/* The Actual Form */}
                    <form onSubmit={handleSubmit} className="iums-login-form">
                        {error && <div className="error-msg">{error}</div>}

                        <div className="form-group">
                            <label className="iums-label">User Email / ID</label>
                            <input
                                type="email"
                                className="iums-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="iums-label">Password</label>
                            <input
                                type="password"
                                className="iums-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="iums-btn-sign-in">
                                Sign in
                            </button>
                            <span className="forgot-pass-link">Forgot password?</span>
                        </div>
                    </form>

                    <p className="signup-notice">
                        Don't have an account? <span onClick={() => navigate('/register')} className="signup-link">Sign Up</span>
                    </p>

                    <footer className="login-page-footer">
                        2026 © - EduPulse University of Science and Technology
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default Login;