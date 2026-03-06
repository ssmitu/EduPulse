import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

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
        <div className="auth-wrapper">
            <div className="auth-card">
                <form onSubmit={handleSubmit} autoComplete="off">
                    <h2>EduPulse Login</h2>

                    {error && <div className="error-msg">{error}</div>}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                            /* THE READ-ONLY TRICK */
                            readOnly={true}
                            onFocus={(e) => e.target.removeAttribute('readonly')}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            /* THE READ-ONLY TRICK */
                            readOnly={true}
                            onFocus={(e) => e.target.removeAttribute('readonly')}
                        />
                    </div>

                    <button type="submit" className="btn-primary">
                        Login
                    </button>

                    <p className="auth-footer-text">
                        Don't have an account? <span className="auth-footer-link" onClick={() => navigate('/register')}>Sign Up</span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;