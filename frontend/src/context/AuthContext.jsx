import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mf_token');
    const savedUser = localStorage.getItem('mf_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Refresh user data
      authAPI.getMe().then(res => {
        setUser(res.data.user);
        localStorage.setItem('mf_user', JSON.stringify(res.data.user));
      }).catch(() => {
        localStorage.removeItem('mf_token');
        localStorage.removeItem('mf_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('mf_token', token);
    localStorage.setItem('mf_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mf_token');
    localStorage.removeItem('mf_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    const updated = { ...user, ...userData };
    setUser(updated);
    localStorage.setItem('mf_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
