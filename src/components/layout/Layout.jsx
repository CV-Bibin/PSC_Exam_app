import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Compass, Flame, Award, Moon, Sun, LayoutDashboard, Activity, Target, 
  Bot, Bookmark, BrainCircuit, LogOut, ShieldAlert, FastForward, Swords
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  
  // State for unattempted exam notifications
  const [unattemptedExams, setUnattemptedExams] = useState(0);

  const userState = { xp: 1450, level: 3, streak: 5, rankTitle: "Overseer Gr-I" };

  // Check for new exams to show on the notification badge
  useEffect(() => {
    const checkForNewExams = async () => {
      try {
        const snap = await getDocs(collection(db, 'weekly_mocks'));
        const completedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
        
        // Count how many published exams are NOT in the user's completed list
        const pendingCount = snap.docs.filter(doc => !completedExams.includes(doc.id)).length;
        setUnattemptedExams(pendingCount);
      } catch (error) {
        console.error("Failed to fetch exams for notification:", error);
      }
    };
    checkForNewExams();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-civil-dark text-slate-200 selection:bg-brand-500 selection:text-black">
      <header className="sticky top-0 z-40 bg-civil-card/80 backdrop-blur-md border-b border-civil-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shadow-lg shadow-brand-500/20 shrink-0">
              <Compass size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white flex items-center gap-2">
                PSC Civil AE <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">Kerala</span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Gamified Prep Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60" title="Current Daily Study Streak">
              <Flame size={16} className="text-brand-500 animate-pulse" />
              <span className="font-bold text-sm text-brand-400">{userState.streak}</span>
              <span className="text-xs text-slate-400 hidden md:inline">Days</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                  <span>{userState.rankTitle}</span>
                  <Award size={14} className="text-brand-500" />
                </div>
                <div className="text-[11px] text-slate-400"><span>{userState.xp.toLocaleString()}</span> / 2,000 XP</div>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 border-2 border-brand-500/40 flex items-center justify-center font-bold text-xs text-white">
                {userState.level}
              </div>
            </div>

            <button onClick={() => navigate('/activity')} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-brand-400 transition">
              <Activity size={16} />
            </button>

            <button onClick={toggleTheme} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 transition">
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button onClick={handleLogout} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 border border-slate-700 flex items-center justify-center text-slate-300 transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900/90 border-b border-slate-800 sticky top-[65px] z-30 px-4">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto custom-scrollbar gap-2 py-2">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem to="/daily" icon={<Target size={16} />} label="Daily Sequence" />
          <NavItem to="/revision" icon={<FastForward size={16} />} label="Daily Revision" />
          
          {/* EXAM ARENA TAB */}
          <NavItem to="/arena" icon={<Swords size={16} />} label="Exam Arena" badge={unattemptedExams} />
          
          <NavItem to="/tutor" icon={<Bot size={16} />} label="AI Tutor" />
          
          {/* FAVORITES/VAULT TAB */}
          <NavItem to="/vault" icon={<Bookmark size={16} />} label="My Favorites" />
          
          <NavItem to="/mistakes" icon={<BrainCircuit size={16} />} label="Mistake Log" />
          
          {(isAdmin || (user && user.email === 'admin@psccivil.com')) && (
            <NavItem to="/admin" icon={<ShieldAlert size={16} className="text-rose-400" />} label="Admin Controls" />
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

// NavItem component with Notification Badge support
function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        px-4 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap text-sm transition relative
        ${isActive ? 'text-brand-400 bg-brand-500/10 border border-brand-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'}
      `}
    >
      {icon} <span>{label}</span>
      
      {badge > 0 && (
        <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-[0_0_10px_rgba(225,29,72,0.5)]">
          {badge}
        </span>
      )}
    </NavLink>
  );
}