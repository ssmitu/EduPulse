import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
// We will create Register later, for now let's just focus on Login

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Redirect empty path to login */}
                <Route path="/" element={<Navigate to="/login" />} />

                {/* Placeholder for Dashboard */}
                <Route path="/dashboard" element={<h1>Dashboard (Coming Soon)</h1>} />
            </Routes>
        </Router>
    );
}

export default App;