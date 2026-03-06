import axios from 'axios';

const API = axios.create({
    baseURL: 'https://localhost:7096/api',
});

// Automatically add the JWT token from sessionStorage to every request
API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;