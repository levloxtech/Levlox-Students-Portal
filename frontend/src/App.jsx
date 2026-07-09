import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // Session Inactivity Auto-Logout (30 minutes)
  useEffect(() => {
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login?reason=inactivity';
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  // Global 401 Unauthenticated Interceptor
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?reason=session_expired';
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <Router>
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

          {/* Fallback routing */}
          <Route 
            path="*" 
            element={
              <RootRedirect />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

// Handler to check credentials on first entry and redirect to matching role view
const RootRedirect = () => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (token && userString) {
    try {
      const user = JSON.parse(userString);
      if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (user.role === 'student') {
        return <Navigate to="/student" replace />;
      }
    } catch (e) {
      // Fall through to login if parsing fails
    }
  }
  return <Navigate to="/login" replace />;
};

export default App;
