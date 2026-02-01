import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <Router>
      <Routes>
        {/* Registration Page */}
        <Route path="/register" element={<Register />} />
        
        {/* Login Page */}
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