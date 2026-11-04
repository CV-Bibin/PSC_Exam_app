import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { 
  Compass, Flame, Award, Moon, Sun, LayoutDashboard, Activity, Target, 
  MessageSquare, Bookmark, BrainCircuit, LogOut, ShieldAlert, FastForward, Swords, Book
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import MasterNotebookModal from '../MasterNotebookModal';

export default function Layout() {
  const { user, isAdmin, logout, completedExams, mistakes, completedDays } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  const [isMasterNotebookOpen, setIsMasterNotebookOpen] = useState(false);
  
  // 🚀 NOTIFICATION STATES (For Red Dots)
  const [hasNewExams, setHasNewExams] = useState(false);
  const [hasNewChat, setHasNewChat] = useState(false);
  const [hasMistakes, setHasMistakes] = useState(false);

  // 🚀 DYNAMIC USER STATS (Calculated from Cloud Data)
  const calculatedXP = (completedDays?.length || 0) * 50 + (completedExams?.length || 0) * 150;
  const currentLevel = Math.floor(calculatedXP / 1000) + 1;
  
  let currentRankTitle = "Aspirant";
  if (currentLevel >= 3) currentRankTitle = "Overseer Gr-III";
  if (currentLevel >= 5) currentRankTitle = "Overseer Gr-II";
  if (currentLevel >= 10) currentRankTitle = "Overseer Gr-I";
  if (currentLevel >= 15) currentRankTitle = "Assistant Engineer";

  // Calculate Streak dynamically
  const userState = { xp: calculatedXP, level: currentLevel, streak: 0, rankTitle: currentRankTitle };

  // 1. EXAM NOTIFICATIONS (Cloud synced)
  useEffect(() => {
    const checkForNewExams = () => {
      const totalDays = completedDays?.length || 0;
      const expectedWeeklyMocks = Math.floor(totalDays / 6);
      const expectedMonthlyMocks = Math.floor(totalDays / 26);
      
      const totalExpectedExams = expectedWeeklyMocks + expectedMonthlyMocks;
      const takenExams = completedExams?.length || 0;
      
      if (totalExpectedExams > takenExams) {
        setHasNewExams(true);
      } else {
        setHasNewExams(false);
      }
    };
    checkForNewExams();
  }, [completedExams, completedDays]);

  // 2. REAL-TIME CHAT NOTIFICATIONS (Checks Firebase)
  useEffect(() => {
    const q = query(collection(db, 'global_discussions'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestDoc = snapshot.docs[0].data();
        const lastSeen = localStorage.getItem('psc_last_chat_seen');
        
        if (!lastSeen) {
          setHasNewChat(true);
        } else {
          const lastSeenDate = new Date(lastSeen).getTime();
          const latestMsgDate = latestDoc.timestamp ? latestDoc.timestamp.toDate().getTime() : Date.now();
          
          // If message is newer than last visit AND they aren't currently on the chat page
          if (latestMsgDate > lastSeenDate && location.pathname !== '/discuss') {
            setHasNewChat(true);
          }
        }
      }
    });
    return () => unsubscribe();
  }, [location.pathname]);

  // 3. MISTAKE LOG NOTIFICATIONS (Cloud synced)
  useEffect(() => {
    // Shows dot if there are any mistakes that haven't reached 'Mastered' status (Streak 3)
    const activeMistakes = (mistakes || []).filter(m => (m.streak || 0) < 3);
    setHasMistakes(activeMistakes.length > 0);
  }, [mistakes]);

  // CLEAR CHAT NOTIFICATION ON CLICK
  const handleChatTabClick = () => {
    localStorage.setItem('psc_last_chat_seen', new Date().toISOString());
    setHasNewChat(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
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

           {/* 🚀 Master Notebook Button (Replaces Theme Toggle) */}
            <button 
              onClick={() => setIsMasterNotebookOpen(true)} 
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 border hover:border-amber-500/50 border-slate-700 flex items-center justify-center text-slate-300 transition shadow-sm"
              title="Open Master Notebook"
            >
              <Book size={16} />
            </button>

            <button onClick={handleLogout} className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 border border-slate-700 flex items-center justify-center text-slate-300 transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900/90 border-b border-slate-800 sticky top-[65px] z-30 px-4">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto custom-scrollbar gap-2 py-3">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem to="/daily" icon={<Target size={16} />} label="Daily Sequence" />
          <NavItem to="/revision" icon={<FastForward size={16} />} label="Daily Revision" />
          
          <NavItem to="/arena" icon={<Swords size={16} />} label="Exam Arena" hasNotification={hasNewExams} />
          
          {/* LIVE DISCUSSION TAB */}
          <NavItem 
            to="/discuss" 
            icon={<MessageSquare size={16} />} 
            label="Live Discussion" 
            hasNotification={hasNewChat}
            onClick={handleChatTabClick} 
          />
          
          <NavItem to="/vault" icon={<Bookmark size={16} />} label="My Favorites" />
          
          <NavItem to="/mistakes" icon={<BrainCircuit size={16} />} label="Mistake Log" hasNotification={hasMistakes} />
          
          {(isAdmin || (user && user.email === 'admin@psccivil.com')) && (
            <NavItem to="/admin" icon={<ShieldAlert size={16} className="text-rose-400" />} label="Admin Controls" />
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* 🚀 Mount the Modal here at the root level so it covers the whole screen! */}
      <MasterNotebookModal 
        isOpen={isMasterNotebookOpen} 
        onClose={() => setIsMasterNotebookOpen(false)} 
      />

    </div>
  );
}

// 🚀 REUSABLE NOTIFICATION DOT COMPONENT
function NotificationDot({ show }) {
  if (!show) return null;
  
  return (
    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]"></span>
    </span>
  );
}

// 🚀 UPGRADED NAV ITEM WITH DOT INTEGRATION
function NavItem({ to, icon, label, hasNotification, onClick }) {
  return (
    <NavLink 
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        px-4 py-2 rounded-xl font-bold flex items-center whitespace-nowrap text-[13px] tracking-wide transition-all relative
        ${isActive 
          ? 'text-brand-400 bg-brand-500/10 border border-brand-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'}
      `}
    >
      <div className="flex items-center gap-2">
        {icon} <span>{label}</span>
      </div>
      <NotificationDot show={hasNotification} />
    </NavLink>
  );
}