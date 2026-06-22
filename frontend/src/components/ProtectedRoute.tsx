import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const ProtectedRoute: React.FC = () => {
  const { token, user, setUser, logout, isAuthenticated } = useAuthStore();
  const [checking, setChecking] = useState(!user && !!token);

  useEffect(() => {
    const loadUser = async () => {
      if (token && !user) {
        try {
          const profile = await api.auth.getMe();
          setUser(profile);
        } catch (err) {
          console.error("Failed to load user profile, logging out:", err);
          logout();
        } finally {
          setChecking(false);
        }
      } else {
        setChecking(false);
      }
    };
    loadUser();
  }, [token, user, setUser, logout]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
export default ProtectedRoute;
