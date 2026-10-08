import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard'; 
import DailySequence from './pages/DailySequence';
import MyActivity from './pages/MyActivity'; 
import MistakeLog from './pages/MistakeLog'; 
import DailyRevision from './pages/DailyRevision';
import MockExam from './pages/MockExam';
import Favorites from './pages/Favorites';
import ExamArena from './pages/ExamArena';

// Placeholders for the remaining student pages we haven't built yet
const AITutor = () => <div className="p-10 text-center text-slate-400 font-bold">AE Chettan AI Chat Interface (Coming Soon)</div>;

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
        
        {/* Main Application Pages */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="activity" element={<MyActivity />} />
        <Route path="daily" element={<DailySequence />} />
        <Route path="revision" element={<DailyRevision />} />
        <Route path="exam/:examId" element={<MockExam />} />
        
        {/* FIXED: Paths match the Navbar exactly without leading slashes */}
        <Route path="vault" element={<Favorites />} />
        <Route path="arena" element={<ExamArena />} />
        
        {/* Memory & AI Tools */}
        <Route path="tutor" element={<AITutor />} />
        <Route path="mistakes" element={<MistakeLog />} />

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