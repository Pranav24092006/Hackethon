// @ts-nocheck
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AmbulanceDashboard } from './components/AmbulanceDashboard';
import { PoliceDashboard } from './components/PoliceDashboard';

/**
 * App Component
 * 
 * Main application component with React Router
 * Routes:
 * - / : Landing page with login/register
 * - /ambulance : Ambulance dashboard (protected)
 * - /police : Police dashboard (protected)
 */

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (token && role) {
    if (role === 'ambulance') {
      return <Navigate to="/ambulance" replace />;
    } else if (role === 'police') {
      return <Navigate to="/police" replace />;
    }
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/ambulance"
          element={
            <ProtectedRoute requiredRole="ambulance">
              <AmbulanceDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/police"
          element={
            <ProtectedRoute requiredRole="police">
              <PoliceDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
