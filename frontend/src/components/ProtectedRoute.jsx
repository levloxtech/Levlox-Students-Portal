import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — guards routes based on Firebase Auth state and user role.
 * Shows a loading spinner while Firebase auth state is resolving.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, authLoading } = useAuth();

  // While Firebase auth state is initializing, show a full-screen loader
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #050308 0%, #0D0A1A 50%, #070510 100%)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 44, height: 44,
          border: '3px solid rgba(108,60,240,0.2)',
          borderTopColor: '#6C3CF0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, margin: 0 }}>
          Loading…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but role not yet determined (edge case — Firestore doc missing)
  if (!userRole) {
    return <Navigate to="/login?reason=no_profile" replace />;
  }

  // Role doesn't match allowed roles → redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/student'} replace />;
  }

  return children;
};

export default ProtectedRoute;
