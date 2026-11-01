import axios from 'axios';

// Otomatis sesuaikan API URL:
// - Di lokal / jaringan Wi-Fi LAN: gunakan port 3001 backend Express
// - Di production / Vercel: otomatis gunakan relative path '/api' (satu domain)
// - Tetap bisa di-override melalui environment variable VITE_API_URL
const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
const isLocal = Boolean(
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  hostname.endsWith('.local')
);

const API_URL = import.meta.env.VITE_API_URL || (isLocal ? `http://${hostname}:3001/api` : '/api');

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Interceptor untuk menyematkan token JWT dari localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('monesca_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor untuk menangani token expired (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (window.location.pathname !== '/login') {
        // Bisa trigger logout jika token hangus
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
