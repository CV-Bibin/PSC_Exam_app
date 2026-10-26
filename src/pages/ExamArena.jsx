import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Swords, Trophy, Target, Clock, BrainCircuit, Play, 
  CheckCircle2, RotateCcw, Search, BarChart3, Radio, FileText, Filter, Lock, Eye
} from 'lucide-react';

export default function ExamArena() {
  const navigate = useNavigate();
  const [weeklyMocks, setWeeklyMocks] = useState([]);
  const [grandMocks, setGrandMocks] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const mockQ = query(collection(db, 'weekly_mocks'), orderBy('createdAt', 'desc'));
        const mockSnap = await getDocs(mockQ);
        const allMocks = mockSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        setGrandMocks(allMocks.filter(m => m.isGrandMock === true));
        setWeeklyMocks(allMocks.filter(m => !m.isGrandMock));

        const liveQ = query(collection(db, 'live_quizzes'), orderBy('scheduledStartTime', 'asc'));
        const liveSnap = await getDocs(liveQ);
        setLiveExams(liveSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error("Error loading exams:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExams();
  }, []);

  // 🚀 UPDATED: Now checks Attempts Log and Admin Max Limits
  const getExamStatus = (exam) => {
    const attemptsLog = JSON.parse(localStorage.getItem('psc_exam_attempts') || '{}');
    const attemptsMade = attemptsLog[exam.id] || 0;
    
    // Safety fallback for old format
    const legacyCompleted = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
    const totalAttempts = Math.max(attemptsMade, legacyCompleted.includes(exam.id) ? 1 : 0);

    const maxAllowed = exam.maxAttempts === 'unlimited' ? Infinity : (exam.maxAttempts || 1);

    if (totalAttempts >= maxAllowed) {
      return { 
        id: 'locked', 
        label: 'Attempts Exhausted', 
        color: 'text-slate-400 bg-slate-900 border-slate-700', 
        icon: Lock, 
        btnText: 'Review Answer Key', 
        btnClass: 'bg-sky-950/80 text-sky-400 hover:bg-sky-900 border border-sky-800 shadow-[0_0_15px_rgba(14,165,233,0.2)]' 
      };
    }

    if (totalAttempts > 0) {
      return { 
        id: 'reattempt', 
        label: `Attempt ${totalAttempts + 1} of ${maxAllowed === Infinity ? '∞' : maxAllowed}`, 
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', 
        icon: RotateCcw, 
        btnText: 'Re-Attempt Assessment', 
        btnClass: 'bg-amber-600 hover:bg-amber-500 text-white font-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
      };
    }
    
    return { 
      id: 'new', 
      label: 'Pending Access', 
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/30', 
      icon: Target, 
      btnText: 'Initiate Assessment', 
      btnClass: 'bg-brand-500 hover:bg-brand-400 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
    };
  };

  const filterExams = (examsList) => {
    return examsList.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getExamStatus(exam).id;
      const matchesFilter = activeFilter === 'all' || 
                            (activeFilter === 'completed' && status === 'locked') || 
                            (activeFilter === 'pending' && status !== 'locked');
      return matchesSearch && matchesFilter;
    });
  };

  const filteredGrandMocks = useMemo(() => filterExams(grandMocks), [grandMocks, searchQuery, activeFilter]);
  const filteredWeeklyMocks = useMemo(() => filterExams(weeklyMocks), [weeklyMocks, searchQuery, activeFilter]);

  // 🚀 FIXED: Math Logic to prevent negative pending tasks
  const totalModuleExams = grandMocks.length + weeklyMocks.length;
  const allCompletedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
  // Only count completed exams that actually exist in the Module list
  const completedModuleExams = allCompletedExams.filter(id => [...grandMocks, ...weeklyMocks].some(m => m.id === id)).length;
  const pendingExamsCount = Math.max(0, totalModuleExams - completedModuleExams);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-16">
      
      {/* 1. ARENA HEADER & STATS (Command Center HUD) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="p-4 bg-brand-500/20 rounded-2xl text-brand-400 border border-brand-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] shrink-0">
              <Swords size={40} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-950/50 text-brand-400 border border-brand-500/30 text-[10px] font-black tracking-widest uppercase shadow-inner">
                <Target size={12} /> Combat Zone
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">Statewide Assessment Arena</h2>
              <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-xl font-medium">Engage in highly calibrated PSC simulations. Your performance here dictates your readiness for the final rank file.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl"></div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
            <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><BarChart3 size={18} className="text-sky-400"/> Readiness Overview</span>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shadow-inner flex flex-col items-center justify-center text-center group hover:border-brand-500/40 transition-colors">
              <span className="block text-3xl font-black text-white group-hover:text-brand-400 transition-colors">{pendingExamsCount}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Pending</span>
            </div>
            <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-900/50 shadow-inner flex flex-col items-center justify-center text-center group hover:border-emerald-500/40 transition-colors">
              <span className="block text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{completedModuleExams}</span>
              <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mt-1">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS (Glassmorphic) */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4 rounded-[2rem] flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-[70px] z-30 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
        <div className="relative w-full lg:w-[400px]">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search assessments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 text-sm font-bold text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-brand-500 transition shadow-inner placeholder:text-slate-600"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0 px-2 lg:px-0">
          <Filter size={18} className="text-slate-500 mr-2 shrink-0 hidden sm:block" />
          <FilterButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} label="All Assessments" />
          <FilterButton active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} label="Pending Tasks" />
          <FilterButton active={activeFilter === 'completed'} onClick={() => setActiveFilter('completed')} label="Completed" />
        </div>
      </div>

      {/* 3. LIVE EVENTS (Tactical Pulse) */}
      {liveExams.length > 0 && activeFilter === 'all' && !searchQuery && (
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-white flex items-center gap-3 border-b border-slate-800 pb-4 px-2">
            <Radio className="text-rose-500 animate-pulse" size={28} /> Live Competitions
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveExams.map(exam => {
              const startDate = new Date(exam.scheduledStartTime);
              const endDate = new Date(exam.scheduledEndTime);
              const isPast = new Date() > endDate;
              const isNow = startDate <= new Date() && !isPast;
              const status = getExamStatus(exam);
              const isLocked = status.id === 'locked';
              
              return (
                <div key={exam.id} className={`p-8 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between group overflow-hidden relative ${isNow && !isLocked ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_40px_rgba(225,29,72,0.15)]' : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-500'}`}>
                  {isNow && !isLocked && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-colors pointer-events-none"></div>}
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isNow ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.5)]' : isPast ? 'bg-slate-900 border border-slate-800 text-slate-500' : 'bg-slate-950 border border-slate-700 text-slate-400'}`}>
                        {isNow ? 'LIVE NOW' : isPast ? 'ENDED' : 'Scheduled Standby'}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2">{exam.title}</h4>
                    
                    <div className="text-sm font-bold text-slate-400 mb-8 flex flex-col gap-2">
                      <span className="flex items-center gap-2">
                        <Clock size={16} className={isNow ? "text-rose-400" : ""}/> 
                        Deployment: {startDate.toLocaleString()}
                      </span>
                      {isNow && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/40 rounded-lg border border-rose-900/50 w-fit">
                          Expires in: <LiveCountdown endTime={exam.scheduledEndTime} />
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 🚀 Dynamic Routing based on Lock Status */}
                  <button 
                    disabled={!(isNow || isLocked)} 
                    onClick={() => navigate(isLocked ? `/exam/${exam.id}?mode=review` : `/exam/${exam.id}`)} 
                    className={`relative z-10 w-full py-4 rounded-xl font-black text-base transition flex justify-center items-center gap-2 ${isLocked ? 'bg-sky-950/80 text-sky-400 border border-sky-800 hover:bg-sky-900 active:scale-95 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : isNow ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] active:scale-95' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-800'}`}
                  >
                    {isLocked ? <><Eye size={18}/> Review Answer Key</> : isNow ? <><Play size={18} /> Enter Live Arena</> : isPast ? "Exam Concluded" : <><Clock size={18} /> Awaiting Deployment</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODULE MASTERY EXAMS */}
      <div className="space-y-6 pt-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 border-b border-slate-800 pb-4 px-2">
          <Trophy className="text-brand-400" size={28} /> Module Mastery Assessments
        </h3>
        {filteredGrandMocks.length === 0 ? (
          <EmptyState message="No Mastery Assessments match your criteria. Complete daily modules to unlock them." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGrandMocks.map(mock => {
              const status = getExamStatus(mock);
              const isLocked = status.id === 'locked';

              return (
                <div key={mock.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-8 rounded-[2rem] hover:-translate-y-1 hover:shadow-2xl hover:border-brand-500/40 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none ${status.id === 'completed' || isLocked ? 'bg-sky-500' : status.id === 'reattempt' ? 'bg-amber-500' : 'bg-brand-500'}`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 shrink-0 ${status.color}`}>
                        <status.icon size={14} /> {status.label}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-6 leading-tight group-hover:text-brand-400 transition-colors">{mock.title}</h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs font-black text-slate-400 mb-8 bg-slate-950/80 inline-flex p-3 px-4 rounded-xl border border-slate-800 shadow-inner">
                      <span className="flex items-center gap-2 uppercase tracking-widest"><FileText size={16} className="text-brand-500" /> {mock.totalQuestions || 0} Qs</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                      <span className="flex items-center gap-2 uppercase tracking-widest"><Clock size={16} className="text-sky-400" /> {mock.timeLimitMinutes} Mins</span>
                    </div>
                  </div>
                  
                  {/* 🚀 Dynamic Routing for Review Mode */}
                  <button 
                    onClick={() => navigate(isLocked ? `/exam/${mock.id}?mode=review` : `/exam/${mock.id}`)} 
                    className={`relative z-10 w-full py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-base uppercase tracking-widest ${status.btnClass}`}
                  >
                    {isLocked ? <><Eye size={16}/> {status.btnText}</> : status.btnText}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. GLOBAL PSC SIMULATIONS */}
      <div className="space-y-6 pt-8">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 border-b border-slate-800 pb-4 px-2">
          <BrainCircuit className="text-sky-400" size={28} /> Global PSC Simulations
        </h3>
        {filteredWeeklyMocks.length === 0 ? (
          <EmptyState message="No simulations match your current filters." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWeeklyMocks.map(mock => {
              const status = getExamStatus(mock);
              const isLocked = status.id === 'locked';

              return (
                <div key={mock.id} className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 p-6 md:p-8 rounded-[2rem] flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl hover:border-slate-500 transition-all duration-300 group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-xl border shadow-inner ${status.color.split(' ')[1]} ${status.color.split(' ')[2]}`} title={status.label}>
                        <status.icon size={18} className={status.color.split(' ')[0]} />
                      </div>
                    </div>
                    <h4 className="font-black text-white text-xl leading-snug mb-4 group-hover:text-sky-400 transition-colors">{mock.title}</h4>
                    <div className="flex items-center gap-3 text-xs font-black text-slate-500 mb-8 uppercase tracking-widest bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 shadow-inner w-fit">
                      <span>{mock.totalQuestions || 0} Qs</span><div className="w-1 h-1 bg-slate-600 rounded-full"></div><span>{mock.timeLimitMinutes} Mins</span>
                    </div>
                  </div>

                  {/* 🚀 Dynamic Routing for Review Mode */}
                  <button 
                    onClick={() => navigate(isLocked ? `/exam/${mock.id}?mode=review` : `/exam/${mock.id}`)} 
                    className={`w-full py-3.5 font-black text-xs uppercase tracking-widest rounded-xl transition active:scale-95 flex items-center justify-center gap-2 ${status.btnClass}`}
                  >
                    {isLocked ? <><Eye size={14}/> {status.btnText}</> : status.btnText}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// UI Sub-components
function FilterButton({ active, onClick, label }) {
  return (
    <button 
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${
        active ? 'bg-brand-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 shadow-inner'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-12 bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800 border-dashed text-slate-400 text-sm font-bold flex flex-col items-center justify-center text-center gap-4">
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
        <Search size={32} className="text-brand-500/50" />
      </div>
      <p className="max-w-md leading-relaxed">{message}</p>
    </div>
  );
}

// Live Countdown Timer Component
// Live Countdown Timer Component
function LiveCountdown({ endTime }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const end = new Date(endTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = end - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('EXPIRED');
        return;
      }
      // 🚀 FIXED MATH: Correctly calculates total days
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      // If there are days left, show "X Days, Yh Zm", otherwise just show "Yh Zm Ss"
      if (d > 0) {
        setTimeLeft(`${d} Days, ${h}h ${m}m`);
      } else {
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span className="font-mono text-rose-400 font-bold">{timeLeft}</span>;
}