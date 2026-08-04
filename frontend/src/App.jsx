import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Root redirect — uses Firebase Auth state to send users to the right place.
 */
const RootRedirect = () => {
  const { currentUser, userRole, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #050308 0%, #0D0A1A 50%, #070510 100%)',
      }}>
        <div style={{
          width: 44, height: 44,
          border: '3px solid rgba(108,60,240,0.2)',
          borderTopColor: '#6C3CF0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  if (userRole === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

/**
 * Inactivity auto-logout — signs out after 30 minutes of no activity.
 */
const InactivityWatcher = () => {
  const { logout } = useAuth();

  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await logout();
        window.location.href = '/login?reason=inactivity';
      }, 30 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach(e => document.removeEventListener(e, reset));
    };
  }, [logout]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <InactivityWatcher />
        <div className="app-container">
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all → smart redirect */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
