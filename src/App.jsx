import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard'; // Uses the real file we just made

// Placeholders for the student pages we haven't built yet
const DailySequence = () => <div className="p-6 text-white">Daily Sequence (Coming Soon)</div>;
const AITutor = () => <div className="p-6 text-white">AE Chettan AI (Coming Soon)</div>;
const RevisionVault = () => <div className="p-6 text-white">Revision Vault (Coming Soon)</div>;

// Standard Student Guard
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Admin Guard
const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Login Routing Logic */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Login />} 
      />

      {/* Protected Layout Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="daily" element={<DailySequence />} />
        <Route path="tutor" element={<AITutor />} />
        <Route path="vault" element={<RevisionVault />} />

        {/* Dedicated Admin Route */}
        <Route path="admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
      </Route>
    </Routes>
  );
}