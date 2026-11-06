import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rf_token') || localStorage.getItem('mf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthPath = window.location.pathname.includes('/login') || 
                         window.location.pathname.includes('/signup') || 
                         window.location.pathname.includes('/verify') ||
                         window.location.pathname.includes('/demo-store');
      
      const isLoginRequest = error.config.url.endsWith('/auth/login');

      if (!isAuthPath && !isLoginRequest) {
        localStorage.removeItem('rf_token');
        localStorage.removeItem('rf_user');
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

// Failures & Recovery Agent API
export const failureAPI = {
  getFailures: (params) => api.get('/failures', { params }),
  getFailureDetail: (id) => api.get(`/failures/${id}`),
  getTimeline: (id) => api.get(`/failures/${id}/timeline`),
  simulateFailure: (data) => api.post('/failures/simulate', data),
  updateSettings: (data) => api.put('/failures/settings', data)
};

// Payment & Plan API
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
  getTransactions: (params) => api.get('/admin/transactions', { params })
};

// Named exports for backward compatibility
export const signup = (data) => authAPI.signup(data);
export const login = (data) => authAPI.login(data);
export const verifyOTP = (data) => authAPI.verifyOTP(data);
export const resendOTP = (data) => authAPI.resendOTP(data);
export const updateProfile = (data) => authAPI.updateProfile(data);

export default api;
