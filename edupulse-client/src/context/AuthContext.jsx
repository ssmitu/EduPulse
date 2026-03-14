import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // MUST use sessionStorage and ACCESS_TOKEN
        const storedUser = sessionStorage.getItem('user');
        const token = sessionStorage.getItem('ACCESS_TOKEN');

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        // MUST use sessionStorage and ACCESS_TOKEN
        sessionStorage.setItem('ACCESS_TOKEN', token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        // MUST use sessionStorage and ACCESS_TOKEN
        sessionStorage.removeItem('ACCESS_TOKEN');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};