import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  Compass, Flame, Award, Moon, Sun, LayoutDashboard, Activity, Target, 
  Bot, MessageSquare, Bookmark, BrainCircuit, LogOut, ShieldAlert, FastForward, Swords
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  
  // 🚀 NOTIFICATION STATES
  const [unattemptedExams, setUnattemptedExams] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingMistakes, setPendingMistakes] = useState(0);

  const userState = { xp: 1450, level: 3, streak: 5, rankTitle: "Overseer Gr-I" };

  // 1. EXAM NOTIFICATIONS (Checks for unattempted published mocks)
  useEffect(() => {
    const checkForNewExams = async () => {
      try {
        const snap = await getDocs(collection(db, 'weekly_mocks'));
        const completedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
        const pendingCount = snap.docs.filter(doc => !completedExams.includes(doc.id)).length;
        setUnattemptedExams(pendingCount);
      } catch (error) {
        console.error("Failed to fetch exams for notification:", error);
      }
    };
    checkForNewExams();
  }, []);

  // 2. REAL-TIME CHAT NOTIFICATIONS
  useEffect(() => {
    const lastReadTimestamp = parseInt(localStorage.getItem('psc_last_chat_read') || '0');
    const chatRef = collection(db, 'global_discussions');
    const q = query(chatRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((doc) => {
        const msgData = doc.data();
        const msgTime = msgData.createdAt?.toMillis() || 0;
        if (msgTime > lastReadTimestamp) unreadCount++;
      });
      setUnreadChats(unreadCount);
    });

    return () => unsubscribe();
  }, []);

  // 3. MISTAKE LOG NOTIFICATIONS
  useEffect(() => {
    const checkMistakes = () => {
      const mistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
      setPendingMistakes(mistakes.length);
    };
    
    checkMistakes(); // Initial check
    
    // Listen for changes if a mistake is made in the Exam Arena
    window.addEventListener('storage', checkMistakes);
    return () => window.removeEventListener('storage', checkMistakes);
  }, []);

  // CLEAR CHAT NOTIFICATION
  const handleChatTabClick = () => {
    localStorage.setItem('psc_last_chat_read', Date.now().toString());
    setUnreadChats(0);
  };

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
          
          {/* EXAM ARENA TAB with notification */}
          <NavItem to="/arena" icon={<Swords size={16} />} label="Exam Arena" badge={unattemptedExams} />
          
          {/* LIVE DISCUSSION TAB with onClick clearance and notification */}
          <NavLink 
            to="/discuss" 
            onClick={handleChatTabClick}
            className={({ isActive }) => 
              `flex items-center px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition relative
              ${isActive ? 'text-slate-950 bg-brand-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <MessageSquare size={16} className="mr-2" />
            <span>Live Discussion</span>
            <NotificationBubble count={unreadChats} />
          </NavLink>
          
          <NavItem to="/vault" icon={<Bookmark size={16} />} label="My Favorites" />
          
          {/* MISTAKE LOG TAB with notification */}
          <NavItem to="/mistakes" icon={<BrainCircuit size={16} />} label="Mistake Log" badge={pendingMistakes} />
          
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

// 🚀 REUSABLE NOTIFICATION BUBBLE COMPONENT
function NotificationBubble({ count }) {
  if (!count || count <= 0) return null;
  const displayCount = count > 99 ? '99+' : count;
  
  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full shadow-md animate-in zoom-in-95 duration-300">
      {displayCount}
    </span>
  );
}

// 🚀 UPGRADED NAV ITEM WITH BUBBLE INTEGRATION
function NavItem({ to, icon, label, badge, onClick }) {
  return (
    <NavLink 
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        px-4 py-2 rounded-lg font-semibold flex items-center whitespace-nowrap text-sm transition relative
        ${isActive ? 'text-brand-400 bg-brand-500/10 border border-brand-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'}
      `}
    >
      <div className="flex items-center gap-2">
        {icon} <span>{label}</span>
      </div>
      <NotificationBubble count={badge} />
    </NavLink>
  );
}