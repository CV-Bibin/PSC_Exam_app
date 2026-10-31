import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, TrendingUp, Flame, Target, BookOpen, Award, ShieldAlert, CheckCircle2, Database, CheckSquare } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MyActivity() {
  const chartRef = useRef(null);

  // 🚀 PURE DATA-DRIVEN STATE
  const [stats, setStats] = useState({
    level: 1,
    rank: "Aspirant",
    streak: 0,
    avgScore: 0,
    missionsCleared: 0,
    totalXP: 0
  });

  const [mistakeStats, setMistakeStats] = useState({
    total: 0,
    critical: 0, // Streak 0
    learning: 0, // Streak 1-2
    mastered: 0, // Streak 3+
    resolutionRate: 0
  });

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [aeSyllabusProgress, setAeSyllabusProgress] = useState([]);
  
  // 🚀 Server Deployment Stats
  const [totalSlidesDeployed, setTotalSlidesDeployed] = useState(0);

  // 🚀 1. PULL REAL-TIME CLOUD DATA FROM FIREBASE
  const { completedDays, globalScores, completedExams, mistakes, dailyCompletionsLog } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 🚀 2. MAP CLOUD DATA TO YOUR LOGIC
      const completedExamsCount = completedExams?.length || 0;
      const mistakeLog = mistakes || [];
      const completionsLog = dailyCompletionsLog || {};
      
      // Filter out invalid score entries to prevent NaN errors
      const validScores = (globalScores || []).filter(s => s.score !== undefined && s.total > 0);

      // 2. FETCH SERVER SLIDE COUNT (Firebase)
      let dbSlideCount = 0;
      try {
        const taskSnap = await getDocs(collection(db, 'daily_tasks'));
        dbSlideCount = taskSnap.docs.length;
        setTotalSlidesDeployed(dbSlideCount);
      } catch (error) {
        console.error("Error fetching total deployed slides:", error);
      }

      // 3. XP & RANK MATH
      const calculatedXP = (completedDays.length * 50) + (completedExamsCount * 150);
      const currentLevel = Math.floor(calculatedXP / 1000) + 1;
      
      let currentRankTitle = "Aspirant";
      if (currentLevel >= 3) currentRankTitle = "Overseer Gr-III";
      if (currentLevel >= 5) currentRankTitle = "Overseer Gr-II";
      if (currentLevel >= 10) currentRankTitle = "Overseer Gr-I";
      if (currentLevel >= 15) currentRankTitle = "Assistant Engineer";

      // 🚀 4. COMBAT AVERAGE MATH (FIXED: Calculates percentage dynamically)
      let avg = 0;
      if (validScores.length > 0) {
        const totalPercent = validScores.reduce((sum, exam) => {
          const pct = (exam.score / exam.total) * 100;
          return sum + pct;
        }, 0);
        avg = Math.round(totalPercent / validScores.length);
      }

      // 5. STREAK CALCULATOR
      let currentStreak = 0;
      const datesWithActivity = Object.keys(completionsLog).sort((a, b) => new Date(b) - new Date(a));
      
      if (datesWithActivity.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (datesWithActivity.includes(today) || datesWithActivity.includes(yesterday)) {
          currentStreak = 1;
          let checkDate = new Date(datesWithActivity[0]);
          for (let i = 1; i < datesWithActivity.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const expectedDateStr = checkDate.toISOString().split('T')[0];
            if (datesWithActivity.includes(expectedDateStr)) currentStreak++;
            else break;
          }
        }
      }

      setStats({
        level: currentLevel,
        rank: currentRankTitle,
        streak: currentStreak,
        avgScore: avg,
        missionsCleared: completedDays.length,
        totalXP: calculatedXP
      });

      // 6. MISTAKE RESOLUTION ANALYTICS
      let crt = 0, lrn = 0, mst = 0;
      mistakeLog.forEach(m => {
        const streak = m.streak || 0;
        if (streak === 0) crt++;
        else if (streak < 3) lrn++;
        else mst++;
      });
      
      setMistakeStats({
        total: mistakeLog.length,
        critical: crt,
        learning: lrn,
        mastered: mst,
        resolutionRate: mistakeLog.length > 0 ? Math.round((mst / mistakeLog.length) * 100) : 0
      });

      // 🚀 7. DYNAMIC LINE CHART (FIXED: Uses dynamically calculated percentage)
      const recentScores = validScores.slice(-7);
      const labels = recentScores.length > 0 ? recentScores.map((_, i) => `Exam ${i + 1}`) : ['No Data'];
      const dataPoints = recentScores.length > 0 
        ? recentScores.map(s => Math.round((s.score / s.total) * 100)) 
        : [0];

      setChartData({
        labels: labels,
        datasets: [
          {
            label: 'Accuracy (%)',
            data: dataPoints,
            borderColor: '#0ea5e9', // Sky 500
            backgroundColor: (context) => {
              const ctx = context.chart?.ctx;
              if (!ctx) return 'transparent';
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
              gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
              return gradient;
            },
            borderWidth: 3,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#0f172a',
            pointBorderColor: '#0ea5e9',
            pointBorderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 8,
          }
        ]
      });

      // 8. OFFICIAL KSHB AE SYLLABUS (100 Marks Total)
      const totalDaysDone = completedDays.length;
      // 8. OFFICIAL KSHB AE SYLLABUS WEIGHTAGE & STRENGTH TRACKING
      const baseTotalSlides = dbSlideCount > 0 ? dbSlideCount : 100;
      
      const aeModules = [
        { name: "Mechanics of Solids & Structural Analysis", weightage: 10 },
        { name: "Fluid Mechanics & Water Resources", weightage: 10 },
        { name: "Surveying, Levelling, QS & Valuation", weightage: 10 },
        { name: "Materials, Const. Tech & Management", weightage: 20 },
        { name: "Environmental Engineering", weightage: 10 },
        { name: "Design of Structures", weightage: 20 },
        { name: "Geotechnical Engineering", weightage: 10 },
        { name: "Transportation Engg & Urban Planning", weightage: 10 },
      ];

      let currentDayTracker = 1;
      const mappedSyllabus = aeModules.map(mod => {
        const targetDays = Math.ceil((mod.weightage / 100) * baseTotalSlides);
        const modStartDay = currentDayTracker;
        const modEndDay = currentDayTracker + targetDays - 1;
        currentDayTracker += targetDays;

        // 🚀 Find exams taken that belong to this specific module's day range
        const moduleExams = (globalScores || []).filter(score => {
          if (!score.examId || !score.examId.startsWith('daily_')) return false;
          const day = parseInt(score.examId.replace('daily_', ''), 10);
          return day >= modStartDay && day <= modEndDay;
        });

        let moduleAccuracy = 0;
        let isAttempted = false;

        // Calculate actual accuracy from Firebase scores
        if (moduleExams.length > 0) {
          isAttempted = true;
          const modTotalScore = moduleExams.reduce((sum, ex) => sum + (ex.score || 0), 0);
          const modTotalQs = moduleExams.reduce((sum, ex) => sum + (ex.total || 0), 0);
          moduleAccuracy = modTotalQs > 0 ? Math.round((modTotalScore / modTotalQs) * 100) : 0;
        }

        return { 
          ...mod, 
          accuracy: moduleAccuracy,
          isAttempted
        };
      });

      setAeSyllabusProgress(mappedSyllabus);
    };

    fetchDashboardData();
  }, [completedDays, globalScores, completedExams, mistakes, dailyCompletionsLog]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
        titleColor: '#38bdf8', 
        bodyColor: '#f8fafc', 
        borderColor: 'rgba(14, 165, 233, 0.3)', 
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 100, 
        grid: { color: 'rgba(51, 65, 85, 0.2)', drawBorder: false }, 
        ticks: { color: '#64748b', font: { family: 'monospace', weight: 'bold' }, padding: 10 } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: '#64748b', font: { weight: 'bold' } } 
      }
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-16 pt-4">
      
      {/* 1. HEADER BANNER */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-sky-500/20 rounded-2xl text-sky-400 border border-sky-500/30 shadow-inner">
                <Activity size={32} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Performance Analytics</h1>
            </div>
            <p className="text-base text-slate-400 font-medium ml-1">Live telemetry strictly tracking your AE syllabus progression and combat recall.</p>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-inner text-right min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Total Experience</span>
            <span className="text-3xl font-black text-brand-400 tracking-tight">{stats.totalXP.toLocaleString()} <span className="text-lg text-slate-400">XP</span></span>
          </div>
        </div>
      </div>

      {/* 2. REAL DATA KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { icon: Award, value: `Lvl ${stats.level}`, label: stats.rank, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
          { icon: Flame, value: `${stats.streak} Days`, label: 'Active Streak', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: stats.streak > 0 },
          { icon: Target, value: `${stats.avgScore}%`, label: 'Avg Drill Score', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { icon: BookOpen, value: stats.missionsCleared.toString(), label: 'Missions Cleared', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-700/50 flex flex-col items-center text-center shadow-lg hover:-translate-y-1 hover:shadow-xl hover:bg-slate-800/50 transition-all duration-300 group">
            <div className={`p-3.5 rounded-2xl border mb-4 transition-colors shadow-inner ${kpi.bg} ${kpi.border} ${kpi.color} group-hover:bg-opacity-20`}>
              <kpi.icon size={28} className={kpi.pulse ? 'animate-pulse' : ''} />
            </div>
            <span className="text-3xl font-black text-white tracking-tight mb-1">{kpi.value}</span>
            <span className="text-[11px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* 3. PERFORMANCE LINE CHART */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl flex flex-col group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-white text-xl flex items-center gap-3">
              <TrendingUp className="text-sky-400" size={24} /> Combat Velocity
            </h3>
            <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-black shadow-inner">
              Last 7 Engagements
            </span>
          </div>
          <div className="h-72 w-full flex-1 relative">
            {chartData.datasets[0]?.data?.length > 0 && chartData.labels[0] !== 'No Data' ? (
              <Line ref={chartRef} data={chartData} options={chartOptions} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-bold text-sm border border-dashed border-slate-700/50 rounded-2xl">
                <Target size={32} className="opacity-40 mb-3" />
                Insufficient exam data. Engage in combat to map velocity.
              </div>
            )}
          </div>
        </div>

        {/* 4. MISTAKE RESOLUTION ANALYTICS */}
        <div className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px]"></div>
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-6 relative z-10">
            <h3 className="font-black text-white text-xl flex items-center gap-3">
              <ShieldAlert className="text-rose-400" size={24} /> Log Analytics
            </h3>
          </div>
          
          <div className="flex-1 flex flex-col justify-center relative z-10">
            <div className="text-center mb-8">
              <span className="text-5xl font-black text-white">{mistakeStats.resolutionRate}<span className="text-2xl text-slate-500">%</span></span>
              <p className="text-[10px] uppercase tracking-widest font-black text-emerald-500 mt-2">Error Resolution Rate</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  Critical Errors <span className="text-xs text-slate-500 ml-1">(Streak 0)</span>
                </div>
                <span className="font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">{mistakeStats.critical}</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  Learning Phase <span className="text-xs text-slate-500 ml-1">(Streak 1-2)</span>
                </div>
                <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">{mistakeStats.learning}</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Mastered <span className="text-xs text-slate-500 ml-1">(Streak 3+)</span>
                </div>
                <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{mistakeStats.mastered}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 SLIDE DEPLOYMENT STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-sky-500/20 shadow-xl flex items-center justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none opacity-50"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-sky-500/10 rounded-[1.5rem] text-sky-400 shadow-inner group-hover:scale-110 transition-transform duration-300 border border-sky-500/20">
              <Database size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Server Synchronization</p>
              <h4 className="text-2xl font-black text-white">{totalSlidesDeployed} <span className="text-lg text-slate-400 font-medium">Slides Deployed</span></h4>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-xl flex items-center justify-between group overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none opacity-50"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
              <CheckSquare size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Mastery</p>
              <h4 className="text-2xl font-black text-white">{stats.missionsCleared} <span className="text-lg text-slate-400 font-medium">Slides Mastered</span></h4>
            </div>
          </div>
          <div className="text-right relative z-10">
            <span className="text-3xl font-black text-emerald-400 bg-emerald-950/50 px-4 py-2 rounded-2xl border border-emerald-500/20 shadow-inner inline-block">
              {totalSlidesDeployed > 0 ? Math.round((stats.missionsCleared / totalSlidesDeployed) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

    {/* 5. SUBJECT STRENGTH & ACCURACY (MAPPED TO SYLLABUS) */}
      <div className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-8">
          <div>
            <h3 className="font-black text-white text-xl flex items-center gap-3">
              <BookOpen className="text-brand-400" size={24} /> Subject Strength & Accuracy
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium ml-9">Analyzes your combat performance mapped to the official KSHB 100-Mark syllabus weightage.</p>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest bg-brand-500/20 px-4 py-2 rounded-xl border border-brand-500/30 shadow-inner hidden md:block">
            Target: 100 Marks
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
          {aeSyllabusProgress.map((mod, idx) => {
            
            // Dynamic Color Grading based on Performance
            let statusLabel = "Not Started";
            let statusColor = "bg-slate-900 border-slate-800 text-slate-500";
            let barColor = "bg-slate-800";
            let valueColor = "text-slate-500";

            if (mod.isAttempted) {
              if (mod.accuracy >= 80) {
                statusLabel = "Strong";
                statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                barColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
                valueColor = "text-emerald-400";
              } else if (mod.accuracy >= 50) {
                statusLabel = "Average";
                statusColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                barColor = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
                valueColor = "text-amber-400";
              } else {
                statusLabel = "Weak";
                statusColor = "bg-rose-500/10 border-rose-500/30 text-rose-400";
                barColor = "bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.5)]";
                valueColor = "text-rose-400";
              }
            }

            return (
              <div key={idx} className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="pr-4">
                    <h4 className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{mod.name}</h4>
                    <p className="text-[10px] font-black text-brand-400/80 uppercase tracking-widest mt-1.5">Weightage: {mod.weightage} Marks</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 ${statusColor}`}>
                    {statusLabel}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                      style={{ width: `${mod.isAttempted ? mod.accuracy : 0}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-black w-9 text-right ${valueColor}`}>
                    {mod.isAttempted ? `${mod.accuracy}%` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}