import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RunPlayground from './pages/RunPlayground';
import Experiments from './pages/Experiments';
import Prompts from './pages/Prompts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

/**
 * Redirect to /login if not authenticated.
 * The full app is wrapped in AuthProvider so useAuth() is always available.
 */
const ProtectedRoute = ({ children }) => {
  const { isLogged } = useAuth();
  return isLogged ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — wrapped in Layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"            element={<Dashboard />} />
                <Route path="/prompts"     element={<Prompts />} />
                <Route path="/runs"        element={<RunPlayground />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/analytics"   element={<Analytics />} />
                <Route path="/settings"    element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
