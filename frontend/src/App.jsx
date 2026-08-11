import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import FullScreenLoader from './components/FullScreenLoader';

// Dashboards are large and mutually exclusive — split them so a student never
// downloads the admin bundle (and vice versa).
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));

/**
 * Root redirect — uses Firebase Auth state to send users to the right place.
 */
const RootRedirect = () => {
  const { currentUser, userRole, authLoading } = useAuth();

  if (authLoading) return <FullScreenLoader />;

  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  if (userRole === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

/**
 * Inactivity auto-logout — signs out after 30 minutes of no activity.
 * Only armed while a user is actually signed in.
 */
const InactivityWatcher = () => {
  const { logout, currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return undefined;

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
  }, [logout, currentUser]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <InactivityWatcher />
          <div className="app-container">
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Student Routes */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ErrorBoundary>
                        <StudentDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Protected Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ErrorBoundary>
                        <AdminDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all → smart redirect */}
                <Route path="*" element={<RootRedirect />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
