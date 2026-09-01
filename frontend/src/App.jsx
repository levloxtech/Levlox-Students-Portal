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
const StudentDetailsPage = lazy(() => import('./pages/StudentDetailsPage'));
const BatchDetailsPage = lazy(() => import('./pages/BatchDetailsPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="app-container">
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />


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
                  path="/admin/students/:studentId"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ErrorBoundary>
                        <StudentDetailsPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/batches/:batchId"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ErrorBoundary>
                        <BatchDetailsPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/*"
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
