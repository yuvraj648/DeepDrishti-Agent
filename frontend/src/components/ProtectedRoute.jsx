import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If specific role is required, check user role
  if (requiredRole && user.role !== requiredRole) {
    // Check role hierarchy
    const roleHierarchy = {
      'captain': 5,
      'vice_captain': 4,
      'surveillance_head': 3,
      'engineer': 2,
      'analyst': 1
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
            <p className="text-slate-400">You don't have permission to access this page.</p>
            <p className="text-slate-500 text-sm mt-2">Required role: {requiredRole}</p>
            <p className="text-slate-500 text-sm">Your role: {user.role}</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
