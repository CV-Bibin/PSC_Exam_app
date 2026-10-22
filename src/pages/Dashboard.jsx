import { useState, useEffect, useMemo } from 'react';
import { 
  HardHat, Target, Check, Layers, Bolt, ShieldAlert, Timer, Trophy, 
  RotateCcw, Play, Calendar as CalendarIcon, Flame, BookCheck, Swords,
  ChevronLeft, ChevronRight, Bookmark, Sparkles, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeMission, setActiveMission] = useState(null);
  const [completedDays, setCompletedDays] = useState([]);
  const [pendingTestDays, setPendingTestDays] = useState([]); 
  const [examState, setExamState] = useState(null);
  const [completedExamsCount, setCompletedExamsCount] = useState(0);
  const [vaultItemsCount, setVaultItemsCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isAllCaughtUp, setIsAllCaughtUp] = useState(false);

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

        const favQ = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]').length;
        const favH = JSON.parse(localStorage.getItem('psc_fav_highlights') || '[]').length;
        const favM = JSON.parse(localStorage.getItem('psc_fav_memorized') || '[]').length;
        setVaultItemsCount(favQ + favH + favM);

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
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isSunday]);

  // Calendar Calculations
  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ empty: true, id: `empty-${i}` });
    }

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

      days.push({ dayNumber: d, isSunday: isSun, isToday, isStartDay, missionDayIndex, isCompleted, id: `day-${d}` });
    }

    return { days, monthName: currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  }, [currentCalendarDate, startDateStr, completedDays]);

  const handlePrevMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Static Syllabus Weightage Reference 
  const syllabusModules = [
    { name: "Surveying & Levelling", weightage: 15, icon: Target, color: "from-brand-500 to-amber-400" },
    { name: "Mechanics of Solids", weightage: 15, icon: Layers, color: "from-sky-500 to-indigo-500" },
    { name: "Building Materials", weightage: 10, icon: HardHat, color: "from-emerald-500 to-teal-400" },
    { name: "Fluid Mechanics", weightage: 10, icon: Activity, color: "from-blue-500 to-cyan-400" },
    { name: "Structural Analysis", weightage: 10, icon: Bolt, color: "from-rose-500 to-pink-500" },
    { name: "Geotechnical Eng.", weightage: 10, icon: ShieldAlert, color: "from-amber-600 to-orange-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-16">
      
      {/* 1. COMMAND CENTER BANNER */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/50 text-brand-400 border border-brand-500/30 text-xs font-black tracking-widest uppercase shadow-inner">
              <HardHat size={14} /> Kerala PSC Technical Officer Track
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Target: <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-amber-200 drop-shadow-sm">Assistant Engineer</span>
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
              Curriculum progression telemetry synced with Kerala PWD Gazetted Syllabus guidelines.
            </p>
          </div>

          <div className="w-full lg:w-80 bg-slate-950/90 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 space-y-4 shadow-2xl shrink-0 group hover:border-brand-500/40 transition-colors duration-500">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">Rank Tier</span>
                <div className="text-brand-400 font-black text-lg">Overseer Gr-I</div>
              </div>
              <Activity className="text-brand-500/40 group-hover:text-brand-400 transition-colors" size={24} />
            </div>
            <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800 shadow-inner">
              <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-amber-300 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] relative overflow-hidden" style={{ width: '72.5%' }}>
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-300">Level 3</span>
              <span className="text-brand-400/80 font-mono">1,450 / 2k XP</span>
              <span className="text-slate-600">Level 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEPLOYMENT MATRIX (Calendar) + EXAM STATUS SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl lg:col-span-2 flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-brand-500/10 text-brand-400 rounded-2xl border border-brand-500/20 shadow-inner">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Deployment Matrix</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  Campaign Start: <b className="text-brand-400">{new Date(startDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <span className="text-sm font-black text-white bg-slate-950 border border-slate-800 px-5 py-2 rounded-xl shadow-inner">
                {calendarData.monthName}
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-inner">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3 text-center flex-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => (
              <div key={dName} className={`text-[10px] md:text-xs font-black uppercase tracking-widest py-1 ${idx === 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {dName}
              </div>
            ))}

            {calendarData.days.map((d) => {
              if (d.empty) return <div key={d.id} className="aspect-square"></div>;
              const isFuture = !d.isCompleted && !d.isToday && !d.isStartDay && !d.isSunday && new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), d.dayNumber) > new Date();

              return (
                <div 
                  key={d.id} 
                  className={`aspect-square p-2 md:p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl ${
                    d.isToday ? 'border-sky-400 bg-sky-950/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]' :
                    d.isStartDay ? 'border-brand-500 bg-brand-950/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
                    d.isSunday ? 'border-rose-900/50 bg-rose-950/20' :
                    d.isCompleted ? 'border-emerald-500/50 bg-emerald-950/30' :
                    isFuture ? 'border-slate-800/30 bg-slate-900/20 opacity-50' :
                    'border-slate-700/60 bg-slate-900/60'
                  }`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <span className={`text-sm md:text-base font-black ${
                      d.isToday ? 'text-sky-300' : d.isStartDay ? 'text-brand-400' : d.isSunday ? 'text-rose-400' : d.isCompleted ? 'text-white' : 'text-slate-400'
                    }`}>
                      {d.dayNumber}
                    </span>
                    {d.isCompleted && !d.isStartDay && (
                      <span className="text-emerald-400 bg-emerald-950/50 p-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <Check size={12} strokeWidth={4} />
                      </span>
                    )}
                  </div>
                  <div className="mt-auto relative z-10">
                    {d.isStartDay ? <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-400 leading-tight">Day 1</div>
                    : d.isSunday ? <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-rose-500 leading-tight truncate">Mock</div>
                    : d.missionDayIndex ? <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate ${d.isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>Day {d.missionDayIndex}</div>
                    : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intelligence Briefing / Exam Status Sidebar */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-rose-500 via-brand-500 to-sky-500"></div>
          
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <ShieldAlert size={20} className="text-slate-300" />
            <h3 className="font-black text-white text-lg uppercase tracking-widest">Intelligence Brief</h3>
          </div>

          <div className="space-y-4">
            {/* Weekly Status */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition"></div>
              <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Weekly Combat Exam</h4>
              {isSunday ? (
                <div>
                  <p className="text-lg font-black text-white mb-1">Active Today</p>
                  <p className="text-xs text-slate-400">Testing {pendingTestDays.length} Modules</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-black text-white mb-1">Pending Standby</p>
                  <p className="text-xs text-slate-400">Deploying on Sunday</p>
                </div>
              )}
            </div>

            {/* Main Section Status */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden group hover:border-brand-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/10 rounded-full blur-xl group-hover:bg-brand-500/20 transition"></div>
              <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Phase 1 Sectional</h4>
              <p className="text-lg font-black text-white mb-2">Surveying & Levelling</p>
              
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full" style={{ width: '80%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">
                <span>Progress</span>
                <span className="text-brand-400">80% Covered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SYLLABUS WEIGHTAGE REFERENCE (Pure Info, No Status) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 border-b border-slate-800 pb-4">
          <Target size={24} className="text-white" />
          <h3 className="font-black text-white text-2xl tracking-tight">Syllabus Weightage Guidelines</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {syllabusModules.map((mod, idx) => {
            const Icon = mod.icon;

            return (
              <div key={idx} className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[2rem] border border-slate-700/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mod.color} opacity-[0.03] group-hover:opacity-10 rounded-full blur-3xl transition-opacity`}></div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform`}>
                    <Icon size={24} className="text-brand-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white mb-1">{mod.name}</h4>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 shadow-inner">
                      <span className="text-xs font-black text-brand-400">{mod.weightage} Marks</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DAILY ACTION CARD & TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pt-4">
        
        {/* Dynamic Action Card */}
        <div className={`p-1 rounded-[2.5rem] shadow-2xl relative overflow-hidden group lg:col-span-2 ${isSunday ? 'bg-gradient-to-br from-rose-500/40 to-slate-900/80' : 'bg-gradient-to-br from-brand-500/40 to-slate-900/80'}`}>
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl rounded-[2.4rem]"></div>
          <div className="relative z-10 h-full p-8 flex flex-col justify-between">
            {isSunday ? (
              pendingTestDays.length > 0 ? (
                <div className="flex flex-col h-full justify-between animate-in zoom-in-95 duration-500">
                  <div className="space-y-4 text-center mt-2">
                    <div className="w-20 h-20 bg-rose-950/80 text-rose-400 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform duration-500">
                      <Trophy size={40} />
                    </div>
                    <div className="space-y-2">
                      <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 font-black text-[10px] uppercase tracking-widest border border-rose-500/20">Sunday Protocol Active</span>
                      <h3 className="font-black text-3xl text-white">Mega-Mock Examination</h3>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/exam/dynamic?days=${pendingTestDays.join(',')}`)} 
                    className={`w-full mt-8 py-5 font-black rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-lg ${
                      examState?.isFinished ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                    }`}
                  >
                    {examState?.isFinished ? <><RotateCcw size={20} /> Re-Attempt Practice</> : examState?.currentIndex > 0 ? <><Play size={20} /> Resume Combat</> : <><Timer size={20} /> Initiate Exam</>}
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center justify-center h-full">
                  <ShieldAlert size={48} className="text-emerald-500/50 mb-4" />
                  <h3 className="font-black text-white mb-2 text-2xl">Rest & Review</h3>
                  <p className="text-sm">All weekly missions tested. Review your Mistake Log.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="font-black text-white flex items-center gap-2 text-xl">
                      <Bolt className="text-amber-400" size={24} fill="currentColor" /> Daily Protocol
                    </h3>
                    {activeMission && (
                      <span className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-400 font-black text-[10px] tracking-widest border border-brand-500/20">
                        DAY {activeMission.dayNumber}
                      </span>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="text-center py-12 text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Mission...</div>
                  ) : isAllCaughtUp ? (
                    <div className="text-center py-10 px-4 bg-emerald-950/20 rounded-3xl border border-emerald-500/20">
                      <Sparkles className="text-emerald-400 mx-auto mb-4" size={36} />
                      <h4 className="text-emerald-400 font-black text-xl mb-2">Modules Mastered!</h4>
                      <p className="text-sm text-slate-400">Awaiting Admin deployment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 hover:bg-slate-800 transition">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                          <Target size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">Solve {activeMission?.curriculumData?.quizzes?.length || 0} MCQs</div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">Combat Mode</span>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4 hover:bg-slate-800 transition">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                          <Layers size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">Drill {activeMission?.curriculumData?.games?.flashcards?.length || 0} Cards</div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">Active Recall</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-8 mt-auto">
                  <div className="text-center mb-4">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block truncate px-2">
                      Subject: {activeMission ? activeMission.title : 'Standby'}
                    </span>
                  </div>
                  <button 
                    onClick={() => navigate('/daily')} 
                    disabled={!activeMission} 
                    className="w-full py-5 text-lg font-black rounded-2xl flex items-center justify-center gap-2 transition active:scale-95 bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:shadow-none"
                  >
                    <Bolt size={22} className={activeMission ? "animate-pulse" : ""} /> {isAllCaughtUp ? "Review Past Missions" : "Launch Sequence"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
          {[
            { icon: Flame, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', value: '5 Days', label: 'Active Streak', pulse: true },
            { icon: BookCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', value: `${completedDays.length} Missions`, label: 'Syllabus Cleared' },
            { icon: Swords, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', value: `${completedExamsCount} Cleared`, label: 'Arena Battles' },
            { icon: Bookmark, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', value: `${vaultItemsCount} Facts`, label: 'Vault Archive' }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 p-5 lg:p-6 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-4 lg:gap-6 shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className={`p-4 rounded-2xl border transition-colors ${kpi.bg} ${kpi.border} ${kpi.color} group-hover:bg-opacity-20`}>
                <kpi.icon size={24} className={kpi.pulse ? 'animate-pulse' : ''} />
              </div>
              <div className="text-center sm:text-left">
                <span className="block text-2xl font-black text-white tracking-tight leading-none mb-1.5">{kpi.value}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}