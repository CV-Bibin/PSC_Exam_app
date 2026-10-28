import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  Swords, Trophy, Target, Clock, BrainCircuit, Play,
  CheckCircle2, RotateCcw, Search, BarChart3, Radio, FileText, Filter, Lock, Eye, CalendarDays, Zap, ChevronDown
} from 'lucide-react';

// ==========================================
// 🚀 COMPONENT 1: MAIN EXAM ARENA (DATA & PRIORITY)
// ==========================================
export default function ExamArena() {
  const navigate = useNavigate();

  // Database States
  const [dailyTasks, setDailyTasks] = useState([]);
  const [weeklyMocks, setWeeklyMocks] = useState([]);
  const [grandMocks, setGrandMocks] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Student Progress & Time Constants
  const completedSlides = JSON.parse(localStorage.getItem('psc_completed_days') || '[]').map(Number);
  const isSunday = new Date().getDay() === 0;
  const isFirstOfMonth = new Date().getDate() === 1;

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const taskQ = query(collection(db, 'daily_tasks'), orderBy('dayNumber', 'asc'));
        const taskSnap = await getDocs(taskQ);
        setDailyTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

 // 🚀 DYNAMIC EXAM GENERATOR ENGINE
  const generatedExams = useMemo(() => {
    const exams = [];
    const completedTasks = dailyTasks.filter(t => completedSlides.includes(Number(t.dayNumber)));
    
    // Find the furthest slide the student has reached to determine unlocks
    const highestCompletedSlide = completedSlides.length > 0 ? Math.max(...completedSlides) : 0;
    
    // 1. DAILY QUIZZES (Unchanged)
    completedTasks.forEach(task => {
      const questions = task.curriculumData?.special_quizzes || task.curriculumData?.quizzes || [];
      if (questions.length > 0) {
        exams.push({
          id: `daily_${task.dayNumber}`,
          type: 'daily',
          title: `Slide ${task.dayNumber} Assessment`,
          subtitle: task.title || 'Daily Protocol', 
          moduleTitle: task.moduleTitle || `Module ${task.moduleNumber}`,
          questions: questions,
          timeLimitMinutes: Math.ceil(questions.length * 1.5),
          maxAttempts: 'unlimited'
        });
      }
    });

    // 2. WEEKLY QUIZZES (STRICT SILOS: Week 1 = 1-6, Week 2 = 7-12)
    const completedWeeks = Math.floor(highestCompletedSlide / 6);
    
    for (let i = 0; i < completedWeeks; i++) {
      const startDay = (i * 6) + 1;
      const endDay = (i + 1) * 6;
      
      // Pull ONLY tasks that fall exactly within this week's boundary
      const weekTasks = dailyTasks.filter(t => {
        const day = Number(t.dayNumber);
        return day >= startDay && day <= endDay;
      });

      let weeklyQuestions = [];
      weekTasks.forEach(t => {
        const qs = t.curriculumData?.special_quizzes || t.curriculumData?.quizzes || [];
        weeklyQuestions.push(...qs);
      });

      if (weeklyQuestions.length > 0) {
        weeklyQuestions.sort(() => Math.random() - 0.5); 
        const CHUNK_SIZE = 40;
        const totalSets = Math.ceil(weeklyQuestions.length / CHUNK_SIZE);

        for (let j = 0; j < totalSets; j++) {
          const chunk = weeklyQuestions.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
          exams.push({
            id: `weekly_w${i + 1}_part${j + 1}`,
            type: 'weekly',
            title: `Weekly Revision ${i + 1} ${totalSets > 1 ? `(Set ${j + 1})` : ''}`,
            subtitle: `Strictly Slides ${startDay} to ${endDay}`, // Updates UI to show exact slides
            questions: chunk,
            timeLimitMinutes: Math.ceil(chunk.length * 1.5),
            maxAttempts: 1
          });
        }
      }
    }

    // 3. MONTHLY EXAMS (STRICT SILOS: Month 1 = 1-26, Month 2 = 27-52)
    const completedMonths = Math.floor(highestCompletedSlide / 26);
    
    for (let i = 0; i < completedMonths; i++) {
      const startDay = (i * 26) + 1;
      const endDay = (i + 1) * 26;

      // Pull ONLY tasks that fall exactly within this month's boundary
      const monthTasks = dailyTasks.filter(t => {
        const day = Number(t.dayNumber);
        return day >= startDay && day <= endDay;
      });

      let monthlyQuestions = [];
      monthTasks.forEach(t => {
        const qs = t.curriculumData?.special_quizzes || t.curriculumData?.quizzes || [];
        monthlyQuestions.push(...qs);
      });

      if (monthlyQuestions.length > 0) {
        monthlyQuestions.sort(() => Math.random() - 0.5); 
        const finalMonthlyQuestions = monthlyQuestions.slice(0, 100); 

        exams.push({
          id: `monthly_m${i + 1}`,
          type: 'monthly',
          title: `Monthly Mega-Exam ${i + 1}`,
          subtitle: `Strictly Slides ${startDay} to ${endDay}`, // Updates UI to show exact slides
          questions: finalMonthlyQuestions,
          timeLimitMinutes: Math.ceil(finalMonthlyQuestions.length * 1.5),
          maxAttempts: 1
        });
      }
    }
    
    return exams.reverse(); 
  }, [dailyTasks, completedSlides]);


  // 🚀 EXAM STATUS & TIME LOCKS
  const getExamStatus = (exam) => {
    const attemptsMade = parseInt(localStorage.getItem(`psc_attempts_${exam.id}`) || '0');
    const legacyCompleted = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
    const totalAttempts = Math.max(attemptsMade, legacyCompleted.includes(exam.id) ? 1 : 0);
    const maxAllowed = exam.maxAttempts === 'unlimited' ? Infinity : (exam.maxAttempts || 1);

    if (totalAttempts >= maxAllowed) {
      return {
        id: 'locked', label: 'Attempts Exhausted', color: 'text-slate-400 bg-slate-900 border-slate-700',
        icon: Lock, btnText: 'Review Answer Key', btnClass: 'bg-sky-950/80 text-sky-400 hover:bg-sky-900 border border-sky-800 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
      };
    }

    if (totalAttempts === 0) {
      if (exam.type === 'weekly' && !isSunday) {
        return {
          id: 'time_locked', label: 'Unlocks on Sunday', color: 'text-slate-500 bg-slate-950 border-slate-800',
          icon: Lock, btnText: 'Time Locked', btnClass: 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed'
        };
      }
      if (exam.type === 'monthly' && !isFirstOfMonth) {
        return {
          id: 'time_locked', label: 'Unlocks on 1st', color: 'text-slate-500 bg-slate-950 border-slate-800',
          icon: Lock, btnText: 'Time Locked', btnClass: 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed'
        };
      }
    }

    if (totalAttempts > 0) {
      return {
        id: 'reattempt', label: `Attempt ${totalAttempts + 1} of ${maxAllowed === Infinity ? '∞' : maxAllowed}`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: RotateCcw, btnText: 'Re-Attempt Assessment', btnClass: 'bg-amber-600 hover:bg-amber-500 text-white font-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
      };
    }

    return {
      id: 'new', label: 'Pending Access', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: Target, btnText: 'Initiate Assessment', btnClass: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
    };
  };

  const getExamMeta = (exam) => {
    if (exam.type === 'daily') return { icon: Target, label: 'Daily Slide', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    if (exam.type === 'weekly') return { icon: CalendarDays, label: 'Weekly Revision', color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' };
    if (exam.type === 'monthly') return { icon: Trophy, label: 'Monthly Mega', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (exam.isGrandMock) return { icon: Trophy, label: 'Module Mastery', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { icon: BrainCircuit, label: 'Global Simulation', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
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

  const allFilteredExams = [
    ...filterExams(generatedExams),
    ...filterExams(grandMocks),
    ...filterExams(weeklyMocks)
  ];

  // 🚀 THE SORTER: Splits "New" exams to the top, sends history/locked to the bottom
  const priorityExams = allFilteredExams.filter(exam => getExamStatus(exam).id === 'new');

  const historyDynamic = filterExams(generatedExams).filter(exam => getExamStatus(exam).id !== 'new');
  const historyGrand = filterExams(grandMocks).filter(exam => getExamStatus(exam).id !== 'new');
  const historyWeekly = filterExams(weeklyMocks).filter(exam => getExamStatus(exam).id !== 'new');

  const totalModuleExams = grandMocks.length + weeklyMocks.length;
  const allCompletedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
  const completedModuleExams = allCompletedExams.filter(id => [...grandMocks, ...weeklyMocks].some(m => m.id === id)).length;
  const pendingExamsCount = Math.max(0, totalModuleExams - completedModuleExams);

  const handleLaunchExam = (exam) => {
    const statusData = getExamStatus(exam);
    if (statusData.id === 'time_locked') return;

    if (['daily', 'weekly', 'monthly'].includes(exam.type)) {
      localStorage.setItem('psc_temp_exam_payload', JSON.stringify(exam));
      navigate(statusData.id === 'locked' ? `/exam/dynamic_${exam.id}?mode=review` : `/exam/dynamic_${exam.id}`);
    } else {
      navigate(statusData.id === 'locked' ? `/exam/${exam.id}?mode=review` : `/exam/${exam.id}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-16">

      {/* 1. ARENA HEADER & STATS */}
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
              <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-xl font-medium">New unlocks deploy directly to your Priority Action Queue at the top.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl"></div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
            <span className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><BarChart3 size={18} className="text-sky-400" /> Readiness Overview</span>
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

      {/* 2. SEARCH & FILTER CONTROLS */}
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

      {/* 3. LIVE EVENTS (Always Top Priority) */}
      {liveExams.length > 0 && activeFilter === 'all' && !searchQuery && (
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-white flex items-center gap-3 border-b border-rose-500/30 pb-4 px-2">
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
                        <Clock size={16} className={isNow ? "text-rose-400" : ""} />
                        Deployment: {startDate.toLocaleString()}
                      </span>
                      {isNow && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/40 rounded-lg border border-rose-900/50 w-fit">
                          Expires in: <LiveCountdown endTime={exam.scheduledEndTime} />
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={!(isNow || isLocked)}
                    onClick={() => handleLaunchExam(exam)}
                    className={`relative z-10 w-full py-4 rounded-xl font-black text-base transition flex justify-center items-center gap-2 ${isLocked ? 'bg-sky-950/80 text-sky-400 border border-sky-800 hover:bg-sky-900 active:scale-95 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : isNow ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] active:scale-95' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-800'}`}
                  >
                    {isLocked ? <><Eye size={18} /> Review Answer Key</> : isNow ? <><Play size={18} /> Enter Live Arena</> : isPast ? "Exam Concluded" : <><Clock size={18} /> Awaiting Deployment</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 4. PRIORITY ACTION CENTER */}
      <div className="space-y-6 pt-4">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 border-b border-emerald-500/30 pb-4 px-2">
          <Zap className="text-emerald-400" size={28} /> Action Required: Available Missions
        </h3>

        {priorityExams.length === 0 ? (
          <EmptyState message="You are entirely caught up! Complete more curriculum slides or wait for scheduled unlocks to generate new missions here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {priorityExams.map(exam => {
              const meta = getExamMeta(exam);

              // 🚀 NEW: Dynamic Button Theme Logic
              let btnTheme = "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]"; // Default Daily (Green)

              if (exam.isGrandMock) {
                btnTheme = "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]"; // Module Mastery (Gold)
              } else if (exam.type === 'monthly') {
                btnTheme = "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(192,38,211,0.4)]"; // Monthly (Purple)
              } else if (exam.type === 'weekly') {
                btnTheme = "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.4)]"; // Weekly (Blue)
              } else if (exam.type === 'live' || exam.id?.includes('live')) {
                btnTheme = "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]"; // Live (Red)
              }

              return (
                <div key={exam.id} className="bg-slate-900/80 border border-emerald-500/30 p-6 rounded-[2rem] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${meta.color}`}>
                      <meta.icon size={14} /> {meta.label}
                    </span>
                  </div>

                  {/* 🚀 NEW: Dynamic Display of Module and Slide Title */}
                  <h4 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight group-hover:text-emerald-400 transition-colors">{exam.title}</h4>
                  {exam.moduleTitle && <p className="text-xs font-semibold text-brand-400 mb-1">{exam.moduleTitle}</p>}
                  {exam.subtitle && <p className="text-sm font-semibold text-slate-400 mb-6 line-clamp-2">{exam.subtitle}</p>}

                  <div className="flex flex-wrap items-center gap-3 text-xs font-black text-slate-400 mb-8 bg-slate-950/80 inline-flex p-3 px-4 rounded-xl border border-slate-800 shadow-inner">
                    <span className="flex items-center gap-2 uppercase tracking-widest"><FileText size={16} className="text-brand-500" /> {exam.questions?.length || exam.totalQuestions || 0} Qs</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <span className="flex items-center gap-2 uppercase tracking-widest"><Clock size={16} className="text-sky-400" /> {exam.timeLimitMinutes} Mins</span>
                  </div>

                  <button
                    onClick={() => handleLaunchExam(exam)}
                    className={`w-full py-4 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-base uppercase tracking-widest font-black ${btnTheme}`}
                  >
                    <Play size={16} /> Initiate Assessment
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 5. ISOLATED HISTORY COMPONENT */}
      <MissionHistory
        historyDynamic={historyDynamic}
        historyGrand={historyGrand}
        historyWeekly={historyWeekly}
        getExamStatus={getExamStatus}
        handleLaunchExam={handleLaunchExam}
      />

    </div>
  );
}


// ==========================================
// 🚀 COMPONENT 2: MISSION HISTORY (BOTTOM SECTION WITH PAGINATION)
// ==========================================
function MissionHistory({ historyDynamic, historyGrand, historyWeekly, getExamStatus, handleLaunchExam }) {
  // 🚀 Added Pagination State for Daily Quizzes
  const [visibleDailyCount, setVisibleDailyCount] = useState(12);
  const dailyHistoryList = historyDynamic.filter(e => e.type === 'daily');

  return (
    <div className="mt-16 pt-12 border-t border-slate-800 space-y-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-400">Mission History & Standby</h2>
        <p className="text-slate-600 mt-2 font-medium">Completed assessments and time-locked future missions file here automatically.</p>
      </div>

      {/* Milestone History */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-500 flex items-center gap-3 border-b border-slate-800/50 pb-3 px-2">
          <CalendarDays size={20} /> Milestone History
        </h3>
        {historyDynamic.filter(e => ['weekly', 'monthly'].includes(e.type)).length === 0 ? (
          <p className="text-xs text-slate-600 italic px-2">No completed milestone missions.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyDynamic.filter(e => ['weekly', 'monthly'].includes(e.type)).map(exam => <HistoryCard key={exam.id} exam={exam} status={getExamStatus(exam)} onLaunch={() => handleLaunchExam(exam)} />)}
          </div>
        )}
      </div>

      {/* Grand Mock History */}
      {historyGrand.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-500 flex items-center gap-3 border-b border-slate-800/50 pb-3 px-2">
            <Trophy size={20} /> Module Mastery History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyGrand.map(exam => <HistoryCard key={exam.id} exam={exam} status={getExamStatus(exam)} onLaunch={() => handleLaunchExam(exam)} />)}
          </div>
        </div>
      )}

      {/* Global Simulation History */}
      {historyWeekly.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-500 flex items-center gap-3 border-b border-slate-800/50 pb-3 px-2">
            <BrainCircuit size={20} /> Global Simulation History
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyWeekly.map(exam => <HistoryCard key={exam.id} exam={exam} status={getExamStatus(exam)} onLaunch={() => handleLaunchExam(exam)} />)}
          </div>
        </div>
      )}

      {/* 🚀 Daily Slide History WITH PAGINATION */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-500 flex items-center gap-3 border-b border-slate-800/50 pb-3 px-2">
          <Target size={20} /> Daily Slide History ({dailyHistoryList.length})
        </h3>
        {dailyHistoryList.length === 0 ? (
          <p className="text-xs text-slate-600 italic px-2">No completed daily quizzes.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {dailyHistoryList.slice(0, visibleDailyCount).map(exam => {
                const statusData = getExamStatus(exam);
                return (
                  <div key={exam.id} className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-600 transition">
                    <div>
                      <h4 className="font-bold text-slate-300 text-sm mb-1 line-clamp-1">{exam.title}</h4>
                      {exam.subtitle && <p className="text-xs font-semibold text-brand-400 mb-3 line-clamp-1">{exam.subtitle}</p>}
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{exam.questions.length} Questions</p>
                    </div>
                    <button
                      onClick={() => handleLaunchExam(exam)}
                      className={`mt-4 w-full py-2.5 font-bold text-[10px] uppercase tracking-widest rounded-lg transition flex items-center justify-center gap-2 ${statusData.id === 'locked' ? 'bg-slate-950 border border-slate-800 text-sky-500/50 hover:bg-slate-800 hover:text-sky-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                    >
                      {statusData.btnText}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {visibleDailyCount < dailyHistoryList.length && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setVisibleDailyCount(prev => prev + 12)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2"
                >
                  <ChevronDown size={16} /> Load More History
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 🚀 UI SUB-COMPONENTS
// ==========================================
function HistoryCard({ exam, status, onLaunch }) {
  const isTimeLocked = status.id === 'time_locked';

  return (
    <div className={`bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between transition-all group ${isTimeLocked ? 'opacity-70 grayscale-[0.3]' : 'hover:border-slate-600'}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 ${status.color}`}>
            <status.icon size={12} /> {status.label}
          </span>
        </div>
        <h4 className="text-lg font-bold text-slate-300 mb-1 leading-tight group-hover:text-white transition-colors">{exam.title}</h4>

        {/* Dynamic Display of Subtitle in History Cards */}
        {exam.subtitle && <p className="text-xs font-semibold text-brand-400 mb-4 line-clamp-1">{exam.subtitle}</p>}

        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 mb-6 uppercase tracking-widest">
          <FileText size={14} className="text-slate-600" /> {exam.questions?.length || exam.totalQuestions || 0} Qs
          <div className="w-1 h-1 rounded-full bg-slate-700"></div>
          <Clock size={14} className="text-slate-600" /> {exam.timeLimitMinutes} Mins
        </div>
      </div>

      <button
        disabled={isTimeLocked}
        onClick={onLaunch}
        className={`w-full py-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2 text-xs uppercase font-black tracking-widest ${status.btnClass}`}
      >
        {isTimeLocked ? <Lock size={14} /> : status.id === 'locked' ? <Eye size={14} /> : <Play size={14} />} {status.btnText}
      </button>
    </div>
  );
}

function FilterButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${active ? 'bg-brand-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 shadow-inner'
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
        <CheckCircle2 size={32} className="text-emerald-500/30" />
      </div>
      <p className="max-w-md leading-relaxed">{message}</p>
    </div>
  );
}

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
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

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