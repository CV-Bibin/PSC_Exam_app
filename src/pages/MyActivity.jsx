import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, TrendingUp, Flame, Target, BookOpen, Award } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MyActivity() {
  const [completedDays, setCompletedDays] = useState([]);

  useEffect(() => {
    const savedDays = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
    setCompletedDays(savedDays);
  }, []);

  // Line Chart Data for Quiz Improvement
  const performanceData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
    datasets: [
      {
        label: 'Combat Quiz Score (%)',
        data: [40, 55, 60, 50, 75, 80, 85], // Mock progression data
        borderColor: '#f59e0b', // brand-500
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#1e293b',
        pointBorderWidth: 2,
        pointRadius: 5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0f172a', titleColor: '#fbbf24', bodyColor: '#f8fafc', borderColor: '#334155', borderWidth: 1 }
    },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
      x: { grid: { display: false }, ticks: { color: '#64748b' } }
    }
  };

  // Syllabus Coverage Data based on Kerala PSC weightage
  const syllabusModules = [
    { name: "Surveying", weightage: 15, covered: 12 },
    { name: "Mechanics of Solids", weightage: 15, covered: 5 },
    { name: "Building Materials & Construction", weightage: 10, covered: 8 },
    { name: "Fluid Mechanics", weightage: 10, covered: 2 },
    { name: "Structural Analysis", weightage: 10, covered: 0 },
    { name: "Geotechnical Engineering", weightage: 10, covered: 10 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Header Section */}
      <div className="bg-civil-card/70 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-brand-500/20 rounded-xl text-brand-400"><Activity size={28} /></div>
            <h1 className="text-3xl font-black text-white">Performance Analytics</h1>
          </div>
          <p className="text-sm text-slate-400">Track your overall syllabus coverage, daily streaks, and active recall improvement.</p>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-lg">
          <Award size={24} className="text-brand-400 mb-2" />
          <span className="text-2xl font-black text-white">Lvl 3</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Current Level</span>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-lg">
          <Flame size={24} className="text-amber-500 mb-2 animate-pulse" />
          <span className="text-2xl font-black text-white">5 Days</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Active Streak</span>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-lg">
          <Target size={24} className="text-rose-400 mb-2" />
          <span className="text-2xl font-black text-white">78%</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Avg Drill Score</span>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center shadow-lg">
          <BookOpen size={24} className="text-emerald-400 mb-2" />
          <span className="text-2xl font-black text-white">{completedDays.length}</span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">Missions Done</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Line Chart */}
        <div className="bg-civil-card p-6 rounded-2xl border border-civil-border shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-brand-400" size={18} /> Combat Quiz Improvement
            </h3>
            <span className="text-xs px-2 py-1 bg-slate-800 rounded-lg text-slate-400 font-bold">Past 7 Days</span>
          </div>
          <div className="h-64 w-full flex-1">
            <Line data={performanceData} options={chartOptions} />
          </div>
        </div>

        {/* Syllabus Weightage Progress Bars */}
        <div className="bg-civil-card p-6 rounded-2xl border border-civil-border shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Target className="text-brand-400" size={18} /> Syllabus Coverage (Weightage)
            </h3>
            <span className="text-xs text-slate-400 font-bold">Target: AE Level</span>
          </div>
          
          <div className="space-y-5">
            {syllabusModules.map((mod, idx) => {
              const percentage = (mod.covered / mod.weightage) * 100;
              const isComplete = percentage >= 100;
              
              return (
                <div key={idx}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-300">{mod.name}</span>
                    <span className="text-xs font-bold text-slate-500">
                      {mod.covered} / {mod.weightage} Marks
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-brand-500'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}