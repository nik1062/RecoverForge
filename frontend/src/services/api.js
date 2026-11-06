import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if it's a login attempt or if we are already on auth pages
      const isAuthPath = window.location.pathname.includes('/login') || 
                         window.location.pathname.includes('/signup') || 
                         window.location.pathname.includes('/verify');
      
      const isLoginRequest = error.config.url.endsWith('/auth/login');

      if (!isAuthPath && !isLoginRequest) {
        localStorage.removeItem('mf_token');
        localStorage.removeItem('mf_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Email API
export const emailAPI = {
  generate: (data) => api.post('/emails/generate', data),
  generateFollowUp: (data) => api.post('/emails/generate-followup', data),
  getHistory: (params) => api.get('/emails/history', { params }),
  getById: (id) => api.get(`/emails/history/${id}`),
  delete: (id) => api.delete(`/emails/history/${id}`)
};

// Payment API
export const paymentAPI = {
  createOrder: (plan) => api.post('/payments/create-order', { plan }),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getTransactions: () => api.get('/payments/transactions')
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getEmailLogs: (params) => api.get('/admin/emails', { params }),
  getTransactions: (params) => api.get('/admin/transactions', { params })
};

// Named exports for backward compatibility
export const signup = (data) => authAPI.signup(data);
export const login = (data) => authAPI.login(data);
export const verifyOTP = (data) => authAPI.verifyOTP(data);
export const resendOTP = (data) => authAPI.resendOTP(data);
export const updateProfile = (data) => authAPI.updateProfile(data);
export const generateEmail = (data) => emailAPI.generate(data);
export const generateFollowUp = (data) => emailAPI.generateFollowUp(data);
export const getHistory = (params) => emailAPI.getHistory(params);
export const deleteHistory = (id) => emailAPI.delete(id);
export const createOrder = (plan) => paymentAPI.createOrder(plan);
export const verifyPayment = (data) => paymentAPI.verifyPayment(data);
export const getTransactions = () => paymentAPI.getTransactions();

export default api;
