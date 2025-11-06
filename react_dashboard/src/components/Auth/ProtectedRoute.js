import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  console.log('[ProtectedRoute] Current state:', { 
    user: user ? { email: user.email, role: user.role, backend: user.backend } : null, 
    loading, 
    allowedRoles 
  });

  if (loading) {
    console.log('[ProtectedRoute] Still loading, showing spinner');
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('[ProtectedRoute] User role not allowed:', user.role, 'Allowed:', allowedRoles);
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Access granted');
  return children;
}

export default ProtectedRoute;
