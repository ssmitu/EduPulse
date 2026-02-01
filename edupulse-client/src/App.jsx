import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

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
       
              <Route path="/dashboard" element={
                  <ProtectedRoute>
                      <Dashboard />
                  </ProtectedRoute>
              } />
      </Routes>
    </Router>
  );
}

export default App;