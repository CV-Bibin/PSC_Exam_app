import { useState, useEffect, useMemo } from 'react';
import {
  Target, Check, Layers, Bolt, ShieldAlert, Trophy,
  RotateCcw, Play, Calendar as CalendarIcon, Flame, BookCheck, Swords,
  ChevronLeft, ChevronRight, Bookmark, Activity, BellRing,
  Radio, History, AlertOctagon, X, Zap, TrendingUp, BookOpen, CheckCircle2, HardHat, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [userName, setUserName] = useState('Aspirant');
  const [greeting, setGreeting] = useState('Hello');

  const [activeMission, setActiveMission] = useState(null);
  const [completedDays, setCompletedDays] = useState([]);
  const [pendingTestDays, setPendingTestDays] = useState([]);
  const [examState, setExamState] = useState(null);
  const [completedExamsCount, setCompletedExamsCount] = useState(0);
  const [vaultItemsCount, setVaultItemsCount] = useState(0);

  const [liveExams, setLiveExams] = useState([]);
  const [pendingMistakesCount, setPendingMistakesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllCaughtUp, setIsAllCaughtUp] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [totalAvailableSlides, setTotalAvailableSlides] = useState(1);

  const [dayCompletionsMap, setDayCompletionsMap] = useState({});
  const [examHistoryMap, setExamHistoryMap] = useState({});

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [startDateStr] = useState(() => {
    let saved = localStorage.getItem('psc_start_date');
    if (!saved) {
      saved = new Date().toISOString();
      localStorage.setItem('psc_start_date', saved);
    }
    return saved;
  });

  const isSunday = new Date().getDay() === 0;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    if (user) {
      const resolvedName = user.displayName || (user.email ? user.email.split('@')[0] : 'Aspirant');
      setUserName(resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1));
    }

    const fetchData = async () => {
      try {
        const storedCompleted = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
        setCompletedDays(storedCompleted);

        const completionsLog = JSON.parse(localStorage.getItem('psc_daily_completions_log') || '{}');
        setDayCompletionsMap(completionsLog);

        const globalScores = JSON.parse(localStorage.getItem('psc_global_scores') || '[]');
        const examMap = {};
        globalScores.forEach(res => {
          if (res.date) {
            const dateKey = new Date(res.date).toISOString().split('T')[0];
            if (!examMap[dateKey]) examMap[dateKey] = [];
            examMap[dateKey].push(res);
          }
        });
        setExamHistoryMap(examMap);

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

        if (activeLiveExams.length > 0 || activeMistakes.length > 0) {
          setTimeout(() => setShowToast(true), 1500);
        }

        const taskSnap = await getDocs(collection(db, 'daily_tasks'));
        const tasks = taskSnap.docs.map(doc => doc.data()).sort((a, b) => a.dayNumber - b.dayNumber);
        setTotalAvailableSlides(Math.max(1, tasks.length));

        if (isSunday) {
          const testedDays = JSON.parse(localStorage.getItem('psc_tested_days') || '[]');
          const daysToTest = storedCompleted.filter(day => !testedDays.includes(day));
          setPendingTestDays(daysToTest);

          const savedState = JSON.parse(localStorage.getItem('psc_exam_state_dynamic') || 'null');
          setExamState(savedState);
        } else {
          if (tasks.length > 0) {
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
  }, [isSunday, user]);

  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push({ empty: true, id: `empty-${i}` });

    const startDate = new Date(startDateStr);
    const today = new Date();

    let currentWeekSlideCount = 0; // Tracks slides completed from Mon-Sat

    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const dateKey = cellDate.toISOString().split('T')[0];
      const isSun = cellDate.getDay() === 0;
      const isMon = cellDate.getDay() === 1;
      const isToday = cellDate.toDateString() === today.toDateString();
      const isStartDay = cellDate.toDateString() === startDate.toDateString();

      // Reset week slide count on Monday
      if (isMon) currentWeekSlideCount = 0;

      let missionDayIndex = null;
      const daysSinceStart = Math.floor((cellDate - startDate) / (1000 * 60 * 60 * 24));
      const isMistakeReviewDay = daysSinceStart > 0 && daysSinceStart % 7 === 0; // Every 7 days

      if (cellDate >= new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) && !isSun) {
        let count = 0;
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        while (cur <= cellDate) {
          if (cur.getDay() !== 0) count++;
          cur.setDate(cur.getDate() + 1);
        }
        missionDayIndex = count;
      }

      const slidesCompletedToday = dayCompletionsMap[dateKey] || [];
      const isCompleted = (missionDayIndex && completedDays.includes(missionDayIndex)) || slidesCompletedToday.length > 0;

      // Add today's slides to the weekly tracker (Mon-Sat only)
      if (!isSun) currentWeekSlideCount += slidesCompletedToday.length;

      const examsTakenToday = examHistoryMap[dateKey] || [];
      const hasLiveEvent = liveExams.some(e => new Date(e.scheduledStartTime).toDateString() === cellDate.toDateString());

      days.push({
        dayNumber: d, dateKey, isSunday: isSun, isToday, isStartDay, missionDayIndex,
        isCompleted, slidesCount: slidesCompletedToday.length, examsTaken: examsTakenToday,
        hasLiveEvent, isMistakeReviewDay, weekSlideCount: currentWeekSlideCount, id: `day-${d}`
      });
    }
    return { days, monthName: currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' }) };
  }, [currentCalendarDate, startDateStr, completedDays, dayCompletionsMap, examHistoryMap, liveExams]);

  const handlePrevMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const calculatedXP = (completedDays.length * 50) + (completedExamsCount * 150);
  const currentLevel = Math.floor(calculatedXP / 1000) + 1;
  const currentTierXP = calculatedXP % 1000;
  const rankProgress = Math.min(100, Math.max(0, (currentTierXP / 1000) * 100));

  let currentRankTitle = "Aspirant";
  if (currentLevel >= 3) currentRankTitle = "Overseer Gr-III";
  if (currentLevel >= 5) currentRankTitle = "Overseer Gr-II";
  if (currentLevel >= 10) currentRankTitle = "Overseer Gr-I";
  if (currentLevel >= 15) currentRankTitle = "Assistant Engineer";

  const totalTargetModules = Math.max(1, Math.ceil(totalAvailableSlides / 6));
  const currentModules = Math.floor(completedDays.length / 6);
  const moduleProgressPercent = Math.min(100, (completedDays.length / totalAvailableSlides) * 100);

  const getDailyQuote = () => {
    const quotes = [
      "Discipline today, Success tomorrow.",
      "Small steps every day lead to big results.",
      "Sweat more in practice, bleed less in war.",
      "Focus on the process, the results will follow.",
      "Consistency transforms average into excellence.",
      "Push yourself, no one else will do it for you.",
      "Your future is created by what you do today."
    ];
    return quotes[new Date().getDay()];
  };

  return (
    <div className="animate-in fade-in duration-700 max-w-7xl mx-auto pb-24 relative overflow-x-hidden pt-4">

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

      {/* PRO HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 px-2">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight flex items-center gap-3">
            {greeting}, {userName} <span className="animate-[wiggle_1s_ease-in-out_infinite] inline-block origin-bottom-right">👋</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base mb-4 font-medium">Good to see you back! Stay consistent, <br className="hidden md:block" />You're closer to your goal than you think.</p>
          <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500">
            <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/50 shadow-inner text-brand-400">Civil Engineer (AE)</span>
            <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/50 shadow-inner">RRB</span>
            <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/50 shadow-inner">Kerala PSC</span>
          </div>
        </div>
        <div className="hidden lg:block text-right self-center bg-slate-900/40 px-6 py-4 rounded-2xl border border-slate-800 shadow-inner">
          <p className="text-slate-400 font-serif italic text-lg leading-relaxed bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-500">
            "{getDailyQuote().split(',')[0]},<br />{getDailyQuote().split(',')[1] || ''}"
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">

        {/* ================= LEFT COLUMN ================= */}
        <div className="xl:col-span-2 space-y-6 md:space-y-8">

          {/* Daily Progress / Action Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sky-500/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Daily Progress</h3>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none">Modules Mastered</h2>
                </div>
              </div>

              <p className="text-slate-300 text-sm md:text-base font-medium mb-8">
                Keep going! You're building the skills for your next big step. Every slide counts.
              </p>

              <div className="mb-6">
                <div className="flex justify-between items-end mb-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <span className="text-brand-400">{completedDays.length} / {totalAvailableSlides} SLIDES</span>
                  <span>{Math.round(moduleProgressPercent)}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 shadow-inner relative overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-1000 relative"
                    style={{ width: `${moduleProgressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mt-4">
                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-white">{completedDays.length}</span> Slides Completed
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-sky-500" />
                    <span className="text-white">{Math.max(0, totalAvailableSlides - completedDays.length)}</span> Slides Remaining
                  </div>
                </div>

                <button
                  onClick={() => navigate(isSunday ? '/arena' : '/daily')}
                  className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 flex items-center justify-center gap-2"
                >
                  Continue Learning <ChevronRight size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          {/* Pro Calendar Matrix (Notification & Multi-Slide Rich) */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6 mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 text-brand-400 rounded-xl border border-slate-700 shadow-inner">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Deployment Matrix</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Operational Intelligence & Telemetry
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <span className="text-xs font-black text-white bg-slate-950/80 border border-slate-700 px-4 py-2 rounded-lg shadow-inner uppercase tracking-widest">
                  {calendarData.monthName}
                </span>
                <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-700 rounded-lg p-1 shadow-inner">
                  <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded md text-slate-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                  <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded md text-slate-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                </div>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Multi-Slide</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Mock Status</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Error Review</div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center flex-1 relative z-10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => (
                <div key={dName} className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest py-2 ${idx === 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {dName}
                </div>
              ))}

              {calendarData.days.map((d) => {
              if (d.empty) return <div key={d.id} className="aspect-square"></div>;
              const isFuture = !d.isCompleted && !d.isToday && !d.isStartDay && !d.isSunday && new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), d.dayNumber) > new Date();

              // 🚀 NEW: Dynamic Tooltip Logic
              let tooltipText = "";
              if (d.isStartDay) tooltipText = "🚀 Mission Started!";
              else if (d.isSunday) {
                if (d.weekSlideCount >= 6) tooltipText = "✅ Weekly Mock Unlocked!";
                else tooltipText = `🔒 Locked: Need ${6 - d.weekSlideCount} more slides this week`;
              }
              else if (d.hasLiveEvent) tooltipText = "🔴 Live Combat Arena Active!";
              else if (d.isMistakeReviewDay) tooltipText = "⚠️ 7-Day Mistake Review Due";
              else if (d.slidesCount > 0) tooltipText = `🔥 Crushed ${d.slidesCount} slides!`;
              else if (isFuture) tooltipText = "Awaiting Deployment";
              else tooltipText = "Standby / No Activity";

              return (
                <div 
                  key={d.id} 
                  className={`aspect-square p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all duration-300 flex flex-col text-left relative group hover:shadow-lg ${
                    d.isToday ? 'border-brand-500/80 bg-brand-950/30' :
                    d.isSunday ? 'border-rose-900/50 bg-rose-950/10' :
                    d.isCompleted ? 'border-slate-700 bg-slate-800' :
                    isFuture ? 'border-transparent bg-transparent opacity-40' :
                    'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  {/* 🚀 NEW: The Floating Hover Tooltip */}
                  <div className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-bold p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-max max-w-[140px] text-center leading-tight scale-95 group-hover:scale-100 hidden md:block">
                    {tooltipText}
                    {/* Triangle Pointer */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-700"></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 -mt-[1px]"></div>
                  </div>

                  <div className="flex justify-between items-start relative z-10 w-full mb-1">
                    <span className={`text-sm md:text-base font-black ${
                      d.isToday ? 'text-brand-400' : 
                      d.isSunday ? 'text-rose-400' : 
                      d.isCompleted ? 'text-white' : 'text-slate-400'
                    }`}>
                      {d.dayNumber}
                    </span>

                    {/* 🚀 EXACT SLIDE TICKS: Shows individual ticks for each slide crushed that day */}
                    {d.slidesCount > 0 && !d.isStartDay && (
                      <div className="absolute top-0 right-0 flex gap-0.5">
                        {Array.from({ length: Math.min(d.slidesCount, 3) }).map((_, i) => (
                          <span key={i} className="text-emerald-400 bg-emerald-950/90 p-[3px] rounded-full shadow-sm border border-emerald-500/30">
                            <Check size={8} strokeWidth={4} />
                          </span>
                        ))}
                        {d.slidesCount > 3 && <span className="text-[9px] font-black text-emerald-400 ml-0.5 pt-0.5">+{d.slidesCount - 3}</span>}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto relative z-10 flex flex-col gap-1 w-full">
                    
                    {/* Sunday Strict Requirement Notification */}
                    {d.isSunday && (
                      d.weekSlideCount >= 6 ? (
                        <div className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-rose-300 bg-rose-950/60 px-1 py-0.5 rounded flex items-center gap-1 border border-rose-500/30">
                          <Zap size={8} className="shrink-0"/> Mock Ready
                        </div>
                      ) : (
                        <div className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-950 px-1 py-0.5 rounded flex items-center gap-1 border border-slate-800">
                          <Lock size={8} className="shrink-0"/> Locked
                        </div>
                      )
                    )}

                    {/* 7-Day Mistake Log Reminder */}
                    {d.isMistakeReviewDay && (
                      <div className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/60 px-1 py-0.5 rounded flex items-center gap-1 border border-amber-500/30">
                        <History size={8} className="shrink-0"/> Log Review
                      </div>
                    )}

                    {/* Exam Score Overlay */}
                    {d.examsTaken.length > 0 && (
                      <div className="text-[8px] font-black bg-slate-900 border border-brand-500/40 text-brand-400 px-1 py-0.5 rounded truncate flex items-center gap-1">
                        <Swords size={8} /> {d.examsTaken[0].score}/{d.examsTaken[0].total}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="space-y-6 md:space-y-8">

          {/* Dynamic Ranking & XP Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="flex justify-between items-end relative z-10 mb-4">
              <div className="space-y-1.5">
                <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">Current Rank Tier</span>
                <div className="text-white font-black text-lg flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" /> {currentRankTitle}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-brand-500/40 flex items-center justify-center font-bold text-sm text-white shadow-inner">
                {currentLevel}
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 shadow-inner relative z-10 mb-3">
              <div className="bg-gradient-to-r from-brand-600 to-amber-300 h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]" style={{ width: `${rankProgress}%` }}></div>
            </div>

            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest relative z-10">
              <span className="text-slate-500">Level {currentLevel}</span>
              <span className="text-brand-400">{currentTierXP} / 1000 XP</span>
            </div>
          </div>

          {/* 2x2 KPI Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Flame, color: 'text-amber-500', bg: 'bg-slate-900', border: 'border-l-amber-500', value: '5 Days', label: 'Streak' },
              { icon: BookCheck, color: 'text-sky-500', bg: 'bg-slate-900', border: 'border-l-sky-500', value: completedDays.length, label: 'Syllabus' },
              { icon: Swords, color: 'text-rose-500', bg: 'bg-slate-900', border: 'border-l-rose-500', value: completedExamsCount, label: 'Battles' },
              { icon: Bookmark, color: 'text-emerald-500', bg: 'bg-slate-900', border: 'border-l-emerald-500', value: vaultItemsCount, label: 'Vault' }
            ].map((kpi, idx) => (
              <div key={idx} className={`${kpi.bg} border border-slate-800 ${kpi.border} border-l-4 p-5 rounded-2xl flex flex-col justify-center items-start shadow-md hover:-translate-y-1 transition-transform group cursor-default`}>
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`p-2 rounded-xl bg-slate-950 shadow-inner ${kpi.color}`}>
                    <kpi.icon size={20} />
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition" />
                </div>
                <span className="block text-2xl font-black text-white tracking-tight mb-1">{kpi.value}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming Missions (Notifications) */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 p-6 rounded-[2rem] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="font-black text-white text-base uppercase tracking-widest flex items-center gap-2">
                <Layers size={18} className="text-slate-400" /> Upcoming Missions
              </h3>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {liveExams.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 cursor-pointer hover:border-rose-500/50 transition-colors shadow-md flex justify-between items-center group" onClick={() => navigate('/arena')}>
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-rose-500/20 rounded-lg text-rose-400 shrink-0 group-hover:scale-110 transition"><Swords size={18} /></div>
                    <div>
                      <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Live Challenge</h4>
                      <p className="text-sm font-bold text-white leading-tight">{liveExams.length} Combat Arenas Active</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-rose-500/50" />
                </div>
              )}

              {pendingMistakesCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50 cursor-pointer hover:border-amber-500/50 transition-colors shadow-md flex justify-between items-center group" onClick={() => navigate('/mistakes')}>
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 group-hover:scale-110 transition"><Trophy size={18} /></div>
                    <div>
                      <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-0.5">Performance Alert</h4>
                      <p className="text-sm font-bold text-white leading-tight">{pendingMistakesCount} Tactical Errors Logged</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-500/50" />
                </div>
              )}

              <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-900/50 shadow-md flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-sky-500/20 rounded-lg text-sky-400 shrink-0"><CalendarIcon size={18} /></div>
                  <div>
                    <h4 className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-0.5">Weekly Mock Exam</h4>
                    <p className="text-sm font-bold text-white leading-tight">{isSunday ? 'Deploying Today' : 'Pending Standby'}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-sky-500/50" />
              </div>

              {liveExams.length === 0 && pendingMistakesCount === 0 && !isSunday && (
                <div className="text-center p-6 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <Check size={24} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">All Clear</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}