import axios from 'axios';

const API = axios.create({
    baseURL: 'https://localhost:7096/api',
});

API.interceptors.request.use((config) => {
    // MUST match the key and storage type used in AuthContext
    const token = sessionStorage.getItem('ACCESS_TOKEN');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default API;