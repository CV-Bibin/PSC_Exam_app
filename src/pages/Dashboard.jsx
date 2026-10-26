import { useState, useEffect, useMemo } from 'react';
import { 
  HardHat, Target, Check, Layers, Bolt, ShieldAlert, Timer, Trophy, 
  RotateCcw, Play, Calendar as CalendarIcon, Flame, BookCheck, Swords,
  ChevronLeft, ChevronRight, Bookmark, Sparkles, Activity, BellRing, 
  Radio, History, AlertOctagon, FileText, X, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeMission, setActiveMission] = useState(null);
  const [completedDays, setCompletedDays] = useState([]);
  const [pendingTestDays, setPendingTestDays] = useState([]); 
  const [examState, setExamState] = useState(null);
  const [completedExamsCount, setCompletedExamsCount] = useState(0);
  const [vaultItemsCount, setVaultItemsCount] = useState(0);
  
  // States for Notifications
  const [liveExams, setLiveExams] = useState([]);
  const [pendingMistakesCount, setPendingMistakesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllCaughtUp, setIsAllCaughtUp] = useState(false);
  
  // 🚀 NEW: Floating Toast Notification State
  const [showToast, setShowToast] = useState(false);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [startDateStr, setStartDateStr] = useState(() => {
    let saved = localStorage.getItem('psc_start_date');
    if (!saved) {
      saved = new Date().toISOString();
      localStorage.setItem('psc_start_date', saved);
    }
    return saved;
  });

  const isSunday = new Date().getDay() === 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedCompleted = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
        setCompletedDays(storedCompleted);

        const storedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
        setCompletedExamsCount(storedExams.length);

        const mistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
        const activeMistakes = mistakes.filter(m => (m.streak || 0) < 3);
        setPendingMistakesCount(activeMistakes.length);

        const favQ = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]').length;
        const favH = JSON.parse(localStorage.getItem('psc_fav_highlights') || '[]').length;
        const favM = JSON.parse(localStorage.getItem('psc_fav_memorized') || '[]').length;
        setVaultItemsCount(favQ + favH + favM);

        const liveQ = query(collection(db, 'live_quizzes'), orderBy('scheduledStartTime', 'asc'));
        const liveSnap = await getDocs(liveQ);
        const fetchedLiveExams = liveSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activeLiveExams = fetchedLiveExams.filter(exam => new Date(exam.scheduledEndTime) > new Date());
        setLiveExams(activeLiveExams);

        // Trigger Toast Notification 1.5 seconds after load if actionable alerts exist
        if (activeLiveExams.length > 0 || activeMistakes.length > 0) {
          setTimeout(() => setShowToast(true), 1500);
        }

        if (isSunday) {
          const testedDays = JSON.parse(localStorage.getItem('psc_tested_days') || '[]');
          const daysToTest = storedCompleted.filter(day => !testedDays.includes(day));
          setPendingTestDays(daysToTest);

          const savedState = JSON.parse(localStorage.getItem('psc_exam_state_dynamic') || 'null');
          setExamState(savedState);
        } else {
          const taskSnap = await getDocs(collection(db, 'daily_tasks'));
          if (!taskSnap.empty) {
            const tasks = taskSnap.docs.map(doc => doc.data()).sort((a, b) => a.dayNumber - b.dayNumber);
            const nextPendingTask = tasks.find(task => !storedCompleted.includes(task.dayNumber));
            
            if (nextPendingTask) {
              setActiveMission(nextPendingTask);
            } else {
              setActiveMission(tasks[tasks.length - 1]);
              setIsAllCaughtUp(true);
            }
          }
        }
      } catch (error) { console.error("Fetch Error:", error); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [isSunday]);

  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push({ empty: true, id: `empty-${i}` });

    const startDate = new Date(startDateStr);
    const today = new Date();

    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const isSun = cellDate.getDay() === 0;
      const isToday = cellDate.toDateString() === today.toDateString();
      const isStartDay = cellDate.toDateString() === startDate.toDateString();

      let missionDayIndex = null;
      if (cellDate >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) && !isSun) {
        let count = 0;
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        while (cur <= cellDate) {
          if (cur.getDay() !== 0) count++;
          cur.setDate(cur.getDate() + 1);
        }
        missionDayIndex = count;
      }

      const isCompleted = missionDayIndex && completedDays.includes(missionDayIndex);
      const hasLiveEvent = liveExams.some(e => new Date(e.scheduledStartTime).toDateString() === cellDate.toDateString());
      const hasRemembrance = isSun && cellDate <= today; 
      const hasActivity = isCompleted || (isSun && cellDate < today);

      days.push({ dayNumber: d, isSunday: isSun, isToday, isStartDay, missionDayIndex, isCompleted, hasLiveEvent, hasRemembrance, hasActivity, id: `day-${d}` });
    }
    return { days, monthName: currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  }, [currentCalendarDate, startDateStr, completedDays, liveExams]);

  const handlePrevMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const syllabusModules = [
    { name: "Surveying & Levelling", weightage: 15, icon: Target, color: "from-brand-500 to-amber-400" },
    { name: "Mechanics of Solids", weightage: 15, icon: Layers, color: "from-sky-500 to-indigo-500" },
    { name: "Building Materials", weightage: 10, icon: HardHat, color: "from-emerald-500 to-teal-400" },
    { name: "Fluid Mechanics", weightage: 10, icon: Activity, color: "from-blue-500 to-cyan-400" },
    { name: "Structural Analysis", weightage: 10, icon: Bolt, color: "from-rose-500 to-pink-500" },
    { name: "Geotechnical Eng.", weightage: 10, icon: ShieldAlert, color: "from-amber-600 to-orange-400" },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-24 relative overflow-x-hidden">
      
      {/* 🚀 FLOATING TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-12 fade-in duration-700 max-w-sm w-full">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-brand-500"></div>
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-widest bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                <Radio size={14} className="animate-pulse" /> Action Required
              </div>
              <button onClick={() => setShowToast(false)} className="text-slate-500 hover:text-white transition-colors p-1 bg-slate-800 rounded-full hover:bg-slate-700">
                <X size={14} />
              </button>
            </div>
            
            <div className="relative z-10">
              {liveExams.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-white font-bold text-sm">Live Combat Arena Active</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{liveExams.length} synchronous deployment(s) currently open.</p>
                </div>
              )}
              {pendingMistakesCount > 0 && (
                <div className="mb-3">
                  <h4 className="text-white font-bold text-sm">Remembrance Review Pending</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{pendingMistakesCount} tactical errors require spaced repetition.</p>
                </div>
              )}
            </div>
            
            <button onClick={() => navigate(liveExams.length > 0 ? '/arena' : '/mistakes')} className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition border border-slate-700 relative z-10 active:scale-95">
              Engage Protocol
            </button>
          </div>
        </div>
      )}

      {/* 1. COMMAND CENTER BANNER */}
      <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-500/10 via-slate-900/20 to-transparent pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="space-y-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 text-brand-400 border border-slate-800 text-xs font-black tracking-widest uppercase shadow-inner">
              <HardHat size={16} className="text-brand-500" /> Kerala PSC Technical Officer Track
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Target: <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-amber-200 to-brand-400 bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] drop-shadow-sm">Assistant Engineer</span>
            </h2>
          </div>

          <div className="w-full lg:w-80 bg-slate-950/80 backdrop-blur-xl p-7 rounded-[2rem] border border-slate-700/50 space-y-5 shadow-2xl shrink-0 group hover:border-brand-500/40 transition-all duration-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex justify-between items-end relative z-10">
              <div className="space-y-1.5">
                <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">Current Rank Tier</span>
                <div className="text-white font-black text-xl flex items-center gap-2"><Trophy size={18} className="text-amber-400"/> Overseer Gr-I</div>
              </div>
              <Activity className="text-brand-500/40 group-hover:text-brand-400 transition-colors" size={28} />
            </div>
            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden p-1 border border-slate-800 shadow-inner relative z-10">
              <div className="bg-gradient-to-r from-brand-600 via-brand-400 to-amber-300 h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] relative overflow-hidden" style={{ width: '72.5%' }}>
                <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-black uppercase tracking-widest relative z-10">
              <span className="text-slate-400">Level 3</span>
              <span className="text-brand-400">1,450 / 2k XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HUB (Action Card + Telemetry Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        
        {/* Dynamic Action Card (Massive Focus Area) */}
        <div className={`xl:col-span-2 p-1 rounded-[3rem] shadow-2xl relative overflow-hidden group ${isSunday ? 'bg-gradient-to-br from-rose-500/50 via-rose-900/20 to-slate-900' : 'bg-gradient-to-br from-brand-500/50 via-brand-900/20 to-slate-900'}`}>
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl rounded-[2.9rem]"></div>
          <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-between">
            {isSunday ? (
              pendingTestDays.length > 0 ? (
                <div className="flex flex-col h-full justify-between animate-in zoom-in-95 duration-500">
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-3">
                      <span className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 font-black text-xs uppercase tracking-widest border border-rose-500/20 shadow-inner flex items-center gap-2 w-fit">
                        <ShieldAlert size={16}/> Sunday Protocol Active
                      </span>
                      <h3 className="font-black text-4xl md:text-5xl text-white tracking-tight">Mega-Mock Examination</h3>
                    </div>
                    <div className="w-20 h-20 bg-rose-950/80 text-rose-400 rounded-3xl flex items-center justify-center border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)] hidden sm:flex shrink-0">
                      <Trophy size={40} />
                    </div>
                  </div>

                  <p className="text-slate-400 text-lg mb-8 max-w-xl leading-relaxed">Synthesizing comprehensive assessment covering {pendingTestDays.length} specific modules to finalize your weekly tactical conditioning.</p>

                  <button 
                    onClick={() => navigate(`/exam/dynamic?days=${pendingTestDays.join(',')}`)} 
                    className={`w-full py-6 font-black rounded-[2rem] shadow-2xl transition active:scale-95 flex items-center justify-center gap-3 text-xl uppercase tracking-widest ${
                      examState?.isFinished ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-[0_0_40px_rgba(225,29,72,0.4)]'
                    }`}
                  >
                    {examState?.isFinished ? <><RotateCcw size={24} /> Re-Attempt Practice</> : examState?.currentIndex > 0 ? <><Play size={24} /> Resume Combat</> : <><Zap size={24} /> Initiate Assessment</>}
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center h-full">
                  <ShieldAlert size={64} className="text-emerald-500/40 mb-6 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]" />
                  <h3 className="font-black text-white mb-3 text-3xl">Standby Mode</h3>
                  <p className="text-lg max-w-md mx-auto">All weekly missions cleared. Review your Mistake Log or await further deployment orders.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-8">
                  <div className="space-y-3">
                    <span className="px-4 py-2 rounded-xl bg-brand-500/10 text-brand-400 font-black text-xs uppercase tracking-widest border border-brand-500/20 shadow-inner flex items-center gap-2 w-fit">
                      <Bolt size={16}/> Daily Protocol
                    </span>
                    <h3 className="font-black text-4xl md:text-5xl text-white tracking-tight">
                      {isLoading ? "Syncing..." : isAllCaughtUp ? "Modules Mastered" : `Mission: Day ${activeMission?.dayNumber}`}
                    </h3>
                  </div>
                  {activeMission && (
                    <div className="w-16 h-16 bg-slate-900 text-brand-400 rounded-3xl flex items-center justify-center border border-slate-800 shadow-inner hidden sm:flex shrink-0">
                      <span className="font-black text-2xl">{activeMission.dayNumber}</span>
                    </div>
                  )}
                </div>

                {!isLoading && !isAllCaughtUp && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-5 hover:bg-slate-800 transition group">
                      <div className="w-14 h-14 rounded-[1.2rem] bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 group-hover:scale-110 transition-transform">
                        <Target size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-black text-white mb-1">{activeMission?.curriculumData?.quizzes?.length || 0} MCQs</div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Combat Mode</span>
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-5 hover:bg-slate-800 transition group">
                      <div className="w-14 h-14 rounded-[1.2rem] bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20 group-hover:scale-110 transition-transform">
                        <Layers size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-black text-white mb-1">{activeMission?.curriculumData?.games?.flashcards?.length || 0} Cards</div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Recall</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-auto relative">
                  {!isAllCaughtUp && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-950 border border-slate-800 rounded-t-2xl text-[10px] font-black text-brand-400 uppercase tracking-widest shadow-inner truncate max-w-[90%]">
                      {activeMission ? activeMission.title : 'Standby'}
                    </div>
                  )}
                  <button 
                    onClick={() => navigate('/daily')} 
                    disabled={!activeMission} 
                    className="w-full py-6 text-xl uppercase tracking-widest font-black rounded-[2rem] flex items-center justify-center gap-3 transition active:scale-95 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:shadow-none relative z-10"
                  >
                    {isAllCaughtUp ? "Review Past Missions" : <><Zap size={24} className={activeMission ? "animate-pulse" : ""} /> Launch Sequence</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2x2 Telemetry Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 h-full">
          {[
            { icon: Flame, color: 'text-amber-500', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]', value: '5 Days', label: 'Streak' },
            { icon: BookCheck, color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]', value: completedDays.length, label: 'Syllabus' },
            { icon: Swords, color: 'text-rose-400', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]', value: completedExamsCount, label: 'Battles' },
            { icon: Bookmark, color: 'text-sky-400', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.2)]', value: vaultItemsCount, label: 'Vault' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center shadow-lg hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity bg-current ${kpi.color}`}></div>
              <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4 group-hover:scale-110 transition-transform ${kpi.color} ${kpi.glow}`}>
                <kpi.icon size={28} />
              </div>
              <span className="block text-3xl font-black text-white tracking-tight leading-none mb-2">{kpi.value}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CALENDAR & INTELLIGENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Advanced Calendar Grid */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 p-6 md:p-10 rounded-[3rem] shadow-2xl lg:col-span-2 flex flex-col relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6 mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl border border-brand-500/20 shadow-inner">
                <CalendarIcon size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight">Deployment Matrix</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  Tactical Timeline & Operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <span className="text-sm font-black text-white bg-slate-950/80 border border-slate-700 px-5 py-2.5 rounded-xl shadow-inner uppercase tracking-widest">
                {calendarData.monthName}
              </span>
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700 rounded-xl p-1 shadow-inner">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4 text-center flex-1 relative z-10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => (
              <div key={dName} className={`text-[10px] md:text-xs font-black uppercase tracking-widest py-2 ${idx === 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {dName}
              </div>
            ))}

            {calendarData.days.map((d) => {
              if (d.empty) return <div key={d.id} className="aspect-square"></div>;
              const isFuture = !d.isCompleted && !d.isToday && !d.isStartDay && !d.isSunday && new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), d.dayNumber) > new Date();

              return (
                <div 
                  key={d.id} 
                  className={`aspect-square p-2 md:p-3 rounded-2xl md:rounded-3xl border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl ${
                    d.isToday ? 'border-sky-400/80 bg-sky-950/30 shadow-[0_0_30px_rgba(56,189,248,0.2)]' :
                    d.isStartDay ? 'border-brand-500/80 bg-brand-950/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
                    d.isSunday ? 'border-rose-900/50 bg-rose-950/10' :
                    d.isCompleted ? 'border-emerald-500/40 bg-emerald-950/20' :
                    isFuture ? 'border-slate-800/30 bg-slate-900/10 opacity-40' :
                    'border-slate-700/50 bg-slate-900/40'
                  }`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className={`text-base md:text-xl font-black ${
                      d.isToday ? 'text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 
                      d.isStartDay ? 'text-brand-400' : 
                      d.isSunday ? 'text-rose-400' : 
                      d.isCompleted ? 'text-white' : 'text-slate-400'
                    }`}>
                      {d.dayNumber}
                    </span>
                    {d.isCompleted && !d.isStartDay && (
                      <span className="text-emerald-400 bg-emerald-950/80 p-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        <Check size={12} strokeWidth={4} />
                      </span>
                    )}
                  </div>

                  <div className="mt-auto relative z-10 flex flex-col gap-1">
                    {d.isStartDay ? <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-400 leading-tight">Day 1</div>
                    : d.isSunday ? <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-rose-500/80 leading-tight truncate">Mock</div>
                    : d.missionDayIndex ? <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate ${d.isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>Day {d.missionDayIndex}</div>
                    : <div className="h-3 md:h-4"></div>}

                    <div className="flex gap-1.5 mt-1 md:mt-2 h-1.5 md:h-2">
                      {d.hasActivity && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Activity Recorded"></div>}
                      {d.hasRemembrance && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" title="Remembrance Review"></div>}
                      {d.hasLiveEvent && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]" title="Live Event Scheduled"></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Notifications Sidebar */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 p-6 md:p-8 rounded-[3rem] shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-brand-500 to-sky-500"></div>
          
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-5">
            <div className="p-3 bg-slate-800 rounded-xl"><BellRing size={20} className="text-white" /></div>
            <h3 className="font-black text-white text-xl uppercase tracking-widest">Intelligence</h3>
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
            
            {liveExams.length > 0 && (
              <div className="p-5 rounded-[1.5rem] bg-rose-950/20 border border-rose-900/50 relative overflow-hidden group hover:border-rose-500/50 transition-colors cursor-pointer shadow-lg" onClick={() => navigate('/arena')}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400 shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse"><Radio size={20}/></div>
                  <div>
                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Live Deployment</h4>
                    <p className="text-base font-black text-white mb-1 leading-tight">{liveExams.length} Combat {liveExams.length === 1 ? 'Arena' : 'Arenas'} Active</p>
                    <p className="text-xs font-bold text-slate-400">Engage immediate operations.</p>
                  </div>
                </div>
              </div>
            )}

            {pendingMistakesCount > 0 && (
              <div className="p-5 rounded-[1.5rem] bg-amber-950/20 border border-amber-900/50 relative overflow-hidden group hover:border-amber-500/50 transition-colors cursor-pointer shadow-lg" onClick={() => navigate('/mistakes')}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"><History size={20}/></div>
                  <div>
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Remembrance Review</h4>
                    <p className="text-base font-black text-white mb-1 leading-tight">{pendingMistakesCount} Tactical Errors Logged</p>
                    <p className="text-xs font-bold text-slate-400">Spaced repetition requires input.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 rounded-[1.5rem] bg-slate-950/80 border border-slate-800 relative overflow-hidden group hover:border-brand-500/50 transition-colors shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-brand-400 shrink-0"><AlertOctagon size={20}/></div>
                <div>
                  <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Weekly Mega-Mock</h4>
                  {isSunday ? (
                    <>
                      <p className="text-base font-black text-white mb-1 leading-tight">Authorization Granted</p>
                      <p className="text-xs font-bold text-slate-400">Testing {pendingTestDays.length} Modules</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-black text-white mb-1 leading-tight">Pending Standby</p>
                      <p className="text-xs font-bold text-slate-400">Deploying strictly on Sunday.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {liveExams.length === 0 && pendingMistakesCount === 0 && !isSunday && (
              <div className="text-center p-8 bg-slate-950/80 border border-slate-800 rounded-[1.5rem] shadow-inner">
                <Check size={32} className="text-emerald-500 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">All Clear</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}