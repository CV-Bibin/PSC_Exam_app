import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard'; 
import DailySequence from './pages/DailySequence';
import MyActivity from './pages/MyActivity'; 
import MistakeLog from './pages/MistakeLog'; 
import DailyRevision from './pages/DailyRevision';
import Favorites from './pages/Favorites';
import ExamArena from './pages/ExamArena';
import CommunityChat from './components/CommunityChat';
import { Toaster } from 'react-hot-toast';
import ActiveExam from './components/ActiveExam'; 

const AITutor = () => <div className="p-10 text-center text-slate-400 font-bold">AE Chettan AI Chat Interface (Coming Soon)</div>;

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

// 🚀 INNER COMPONENT: Handles routing now that AuthProvider is wrapped around it
function AppRoutes() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Login />} 
      />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="activity" element={<MyActivity />} />
        <Route path="daily" element={<DailySequence />} />
        <Route path="revision" element={<DailyRevision />} />
        <Route path="exam/:id" element={<ActiveExam />} />
        <Route path="vault" element={<Favorites />} />
        <Route path="arena" element={<ExamArena />} />
        <Route path="tutor" element={<AITutor />} />
        <Route path="mistakes" element={<MistakeLog />} />
        <Route path="discuss" element={<CommunityChat />} />
        
        <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

// 🚀 OUTER COMPONENT: Provides Auth and Toaster to the whole app
export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            fontWeight: 'bold'
          }
        }} 
      />
      <AppRoutes />
    </AuthProvider>
  );
}