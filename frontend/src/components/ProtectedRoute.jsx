import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenLoader from './FullScreenLoader';

/**
 * ProtectedRoute — guards routes based on Firebase Auth state and user role.
 * Shows a loading spinner while Firebase auth state is resolving.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, authLoading, logout } = useAuth();

  // While Firebase auth state is initializing, show a full-screen loader
  if (authLoading) {
    return <FullScreenLoader label="Loading…" />;
  }

  // Not authenticated → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated with Firebase but no matching students/admins document.
  // Redirecting to /login would loop forever (the session is still valid), so
  // explain the state and offer the only useful action: sign out.
  if (!userRole) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '48px 24px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #050308 0%, #0D0A1A 50%, #070510 100%)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#fff' }}>
          Account not set up yet
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.55)', maxWidth: 420, lineHeight: 1.55 }}>
          Your sign-in worked, but this account has no student or admin record in the portal.
          Please contact your Levlox administrator to have your profile activated.
        </p>
        <button
          type="button"
          onClick={logout}
          style={{
            marginTop: 8,
            padding: '10px 22px',
            borderRadius: 10,
            border: 'none',
            background: '#6C3CF0',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  // Role doesn't match allowed roles → redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/student'} replace />;
  }

  return children;
};

export default ProtectedRoute;
