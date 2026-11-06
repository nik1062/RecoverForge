
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">refresh</span>
        <span className="text-text-secondary">Loading...</span>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
