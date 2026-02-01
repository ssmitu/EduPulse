import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    // If no user is logged in, send them back to login
    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;