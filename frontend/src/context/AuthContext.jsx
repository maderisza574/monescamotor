import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('monesca_token');
    const storedUser = localStorage.getItem('monesca_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verifikasi profile ke backend di latar belakang
        api.get('/auth/profile')
          .then((res) => {
            if (res.data?.data) {
              setUser(res.data.data);
              localStorage.setItem('monesca_user', JSON.stringify(res.data.data));
            }
          })
          .catch(() => {
            // Jika token invalid/expired, bersihkan session
            logout();
          });
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { user: userData, token } = response.data.data;
    localStorage.setItem('monesca_token', token);
    localStorage.setItem('monesca_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('monesca_token');
    localStorage.removeItem('monesca_user');
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isKasir = user?.role === 'KASIR';
  const isGudang = user?.role === 'GUDANG';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isSuperAdmin, isKasir, isGudang }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
