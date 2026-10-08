import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { 
  HardHat, Target, Check, Layers, Bolt, ShieldAlert, Timer, Trophy, 
  RotateCcw, Play, Calendar as CalendarIcon, Flame, BookCheck, Swords,
  ChevronLeft, ChevronRight, Bookmark, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

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

      // Estimate curriculum day number from start date (excluding Sundays)
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

      days.push({
        dayNumber: d,
        isSunday: isSun,
        isToday,
        isStartDay,
        missionDayIndex,
        isCompleted,
        id: `day-${d}`
      });
    }

    return {
      days,
      monthName: currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  }, [currentCalendarDate, startDateStr, completedDays]);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const radarData = {
    labels: ['Structural', 'Geotech', 'Fluid Mech', 'Environmental', 'Surveying', 'Transportation', 'Concrete & Building'],
    datasets: [{
      label: 'Mastery', 
      data: [82, 65, 74, 58, 90, 70, 88],
      backgroundColor: 'rgba(245, 158, 11, 0.22)', 
      borderColor: '#f59e0b', 
      borderWidth: 2, 
      pointBackgroundColor: '#fbbf24',
      pointBorderColor: '#0f172a',
      pointBorderWidth: 1.5,
      pointRadius: 4
    }],
  };

  const radarOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    scales: { 
      r: { 
        ticks: { display: false }, 
        suggestedMin: 0, 
        suggestedMax: 100, 
        grid: { color: '#1e293b' }, 
        angleLines: { color: '#334155' }, 
        pointLabels: { color: '#94a3b8', font: { size: 11, weight: '600' } } 
      } 
    }, 
    plugins: { legend: { display: false } } 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      
      {/* 1. TOP DESIGNATION BANNER */}
      <div className="bg-civil-card/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 text-xs font-bold tracking-wide uppercase">
              <HardHat size={14} /> Kerala PSC Technical Officer Track
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Target: <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-amber-200">Assistant Engineer (PWD / Irrigation)</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Curriculum progression synced with Kerala PWD Gazetted Syllabus guidelines.
            </p>
          </div>

          <div className="w-full lg:w-80 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3.5 shadow-xl shrink-0">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">Rank Tier</span>
              <span className="text-brand-400 font-black">Overseer Gr-I</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
              <div className="bg-gradient-to-r from-brand-500 to-amber-400 h-full rounded-full transition-all duration-700" style={{ width: '72.5%' }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span className="text-slate-300 font-bold">Level 3</span>
              <span>1,450 / 2,000 XP</span>
              <span className="text-slate-500">Level 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TELEMETRY KPI COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-civil-card border border-civil-border p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20"><Flame size={22} className="animate-pulse" /></div>
          <div>
            <span className="block text-xl font-black text-white">5 Days</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Streak</span>
          </div>
        </div>
        <div className="bg-civil-card border border-civil-border p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><BookCheck size={22} /></div>
          <div>
            <span className="block text-xl font-black text-white">{completedDays.length} Missions</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Syllabus Concluded</span>
          </div>
        </div>
        <div className="bg-civil-card border border-civil-border p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20"><Swords size={22} /></div>
          <div>
            <span className="block text-xl font-black text-white">{completedExamsCount} Cleared</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arena Battles</span>
          </div>
        </div>
        <div className="bg-civil-card border border-civil-border p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><Bookmark size={22} /></div>
          <div>
            <span className="block text-xl font-black text-white">{vaultItemsCount} Facts</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vault Archive</span>
          </div>
        </div>
      </div>

      {/* 3. RADAR & ACTION PROTOCOL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Chart */}
        <div className="bg-civil-card p-6 rounded-3xl border border-civil-border space-y-4 lg:col-span-2 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <Target className="text-brand-400" size={20} /> Subject Weightage Mastery Matrix
            </h3>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">KPSC AE Weightage</span>
          </div>
          <div className="h-72 w-full pt-2">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        {/* Dynamic Action Card */}
        <div className="bg-civil-card p-6 rounded-3xl border border-civil-border shadow-lg flex flex-col justify-between">
          {isSunday ? (
            pendingTestDays.length > 0 ? (
              <div className="flex flex-col h-full justify-between animate-in zoom-in-95 duration-500">
                <div className="space-y-4 text-center mt-2">
                  <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                    <Trophy size={40} />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-black text-[10px] uppercase tracking-widest border border-rose-500/30">
                      Sunday Protocol Activated
                    </span>
                    <h3 className="font-black text-2xl text-white mt-2">Sunday Mega-Mock</h3>
                  </div>
                  
                  {examState?.isFinished ? (
                    <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 font-bold text-sm">
                      Exam Concluded! <br/><span className="text-xs text-emerald-200/60">First Attempt Score Locked</span>
                    </div>
                  ) : examState?.currentIndex > 0 ? (
                    <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl text-amber-400 font-bold text-sm">
                      Exam in Progress <br/><span className="text-xs text-amber-200/60">Resume from Question {examState.currentIndex + 1}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 leading-relaxed px-2">
                      Testing active recall for <b>{pendingTestDays.length}</b> completed day(s).
                    </p>
                  )}
                </div>

                <button 
                  onClick={() => navigate(`/exam/dynamic?days=${pendingTestDays.join(',')}`)} 
                  className={`w-full mt-6 py-4 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
                    examState?.isFinished 
                      ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]'
                  }`}
                >
                  {examState?.isFinished ? (
                    <><RotateCcw size={20} /> Re-Attempt for Practice</> 
                  ) : examState?.currentIndex > 0 ? (
                    <><Play size={20} /> Resume Exam</> 
                  ) : (
                    <><Timer size={20} /> Generate & Start Exam</>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">Sunday Rest & Review</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  All weekly missions have been tested. Take time to review your Mistake Log or relax before Monday's new module launches.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-white flex items-center gap-2 text-base">
                    <Check className="text-emerald-400" size={18} /> Daily Protocol
                  </h3>
                  {activeMission && (
                    <span className="px-2.5 py-0.5 rounded-md bg-brand-500/20 text-brand-400 font-black text-[10px] tracking-wide border border-brand-500/30">
                      DAY {activeMission.dayNumber}
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-slate-500 text-xs animate-pulse">Syncing Mission...</div>
                ) : isAllCaughtUp ? (
                  <div className="text-center py-10 px-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/30">
                    <Sparkles className="text-emerald-400 mx-auto mb-2" size={28} />
                    <h4 className="text-emerald-400 font-black text-base">All Modules Mastered!</h4>
                    <p className="text-xs text-slate-400 mt-1">Check back once the Admin publishes tomorrow's syllabus.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                        <Target size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Solve {activeMission?.curriculumData?.quizzes?.length || 0} Combat MCQs</div>
                        <span className="text-[10px] text-slate-500">Timed Elimination Mode</span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                        <Layers size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Drill {activeMission?.curriculumData?.games?.flashcards?.length || 0} Memory Flashcards</div>
                        <span className="text-[10px] text-slate-500">Active Recall Retrieval</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-800 mt-4">
                <div className="text-center mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                    Subject: {activeMission ? activeMission.title : 'Standby'}
                  </span>
                </div>
                <button 
                  onClick={() => navigate('/daily')} 
                  disabled={!activeMission} 
                  className="w-full py-3.5 font-black rounded-xl flex items-center justify-center gap-2 transition active:scale-95 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-400 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                >
                  <Bolt size={18} /> {isAllCaughtUp ? "Review Past Missions" : "Launch Daily Mission"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. PRO-LEVEL STUDY CALENDAR MATRIX */}
      <div className="bg-civil-card border border-civil-border p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl border border-brand-500/20">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Curriculum Schedule & Timeline Matrix</h3>
              <p className="text-xs text-slate-400">
                Course Launched on <b className="text-brand-400">{new Date(startDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</b> (Day 1)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
              {calendarData.monthName}
            </span>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand-500 ring-2 ring-brand-400/40"></span>
            <span>Day 1 (Inception)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>Mission Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/60"></span>
            <span>Sunday Mega-Mock / Rest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-sky-400"></span>
            <span>Today</span>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => (
            <div key={dName} className={`text-xs font-black uppercase tracking-wider py-2 ${idx === 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {dName}
            </div>
          ))}

          {calendarData.days.map((d) => {
            if (d.empty) {
              return <div key={d.id} className="min-h-[70px] bg-slate-950/20 rounded-xl border border-transparent"></div>;
            }

            return (
              <div 
                key={d.id} 
                className={`min-h-[74px] p-2 rounded-2xl border transition-all flex flex-col justify-between text-left relative overflow-hidden group ${
                  d.isToday ? 'border-sky-400 bg-sky-950/20 shadow-[0_0_15px_rgba(56,189,248,0.15)]' :
                  d.isStartDay ? 'border-brand-500/60 bg-brand-950/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                  d.isSunday ? 'border-rose-950/60 bg-rose-950/20 hover:bg-rose-950/30' :
                  d.isCompleted ? 'border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/30' :
                  'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-black ${
                    d.isToday ? 'text-sky-300' :
                    d.isStartDay ? 'text-brand-300' :
                    d.isSunday ? 'text-rose-400' :
                    'text-slate-300'
                  }`}>
                    {d.dayNumber}
                  </span>

                  {d.isStartDay && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-brand-500 text-slate-950 px-1.5 py-0.5 rounded shadow">
                      Day 1
                    </span>
                  )}
                  {d.isCompleted && !d.isStartDay && (
                    <span className="text-emerald-400">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  {d.isSunday ? (
                    <div className="text-[10px] font-bold text-rose-400/90 leading-tight">
                      Sunday Mock
                    </div>
                  ) : d.missionDayIndex ? (
                    <div className={`text-[10px] font-bold ${d.isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                      Day {d.missionDayIndex}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 font-medium">Standby</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}