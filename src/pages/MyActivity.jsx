import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity, TrendingUp, Flame, Target, BookOpen, Award } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MyActivity() {
  const [completedDays, setCompletedDays] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    const savedDays = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
    setCompletedDays(savedDays);
  }, []);

  // Line Chart Data for Quiz Improvement
  const performanceData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
    datasets: [
      {
        label: 'Combat Score (%)',
        data: [40, 55, 60, 50, 75, 80, 85], // Mock progression data
        borderColor: '#f59e0b', // brand-500
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
          return gradient;
        },
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0f172a',
        pointBorderColor: '#f59e0b',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
        titleColor: '#fbbf24', 
        bodyColor: '#f8fafc', 
        borderColor: 'rgba(245, 158, 11, 0.3)', 
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 100, 
        grid: { color: 'rgba(51, 65, 85, 0.3)', drawBorder: false }, 
        ticks: { color: '#94a3b8', font: { family: 'monospace' }, padding: 10 } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: '#94a3b8', font: { weight: 'bold' } } 
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Syllabus Coverage Data based on Kerala PSC weightage
  const syllabusModules = [
    { name: "Surveying & Levelling", weightage: 15, covered: 12 },
    { name: "Mechanics of Solids", weightage: 15, covered: 5 },
    { name: "Building Materials & Construction", weightage: 10, covered: 8 },
    { name: "Fluid Mechanics & Hydraulics", weightage: 10, covered: 2 },
    { name: "Structural Analysis", weightage: 10, covered: 0 },
    { name: "Geotechnical Engineering", weightage: 10, covered: 10 },
    { name: "Transportation Engineering", weightage: 10, covered: 3 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-16">
      
      {/* 1. HEADER BANNER */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-brand-500/20 rounded-2xl text-brand-400 border border-brand-500/30 shadow-inner">
                <Activity size={32} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Performance Analytics</h1>
            </div>
            <p className="text-base text-slate-400 font-medium ml-1">Track your syllabus coverage, streak dynamics, and combat recall velocity.</p>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { icon: Award, value: 'Lvl 3', label: 'Current Tier', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
          { icon: Flame, value: '5 Days', label: 'Active Streak', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', pulse: true },
          { icon: Target, value: '78%', label: 'Avg Drill Score', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { icon: BookOpen, value: completedDays.length.toString(), label: 'Missions Cleared', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-700/50 flex flex-col items-center text-center shadow-lg hover:-translate-y-1 hover:shadow-xl hover:bg-slate-800/50 transition-all duration-300 group">
            <div className={`p-3.5 rounded-2xl border mb-4 transition-colors ${kpi.bg} ${kpi.border} ${kpi.color} group-hover:bg-opacity-20`}>
              <kpi.icon size={28} className={kpi.pulse ? 'animate-pulse' : ''} />
            </div>
            <span className="text-3xl font-black text-white tracking-tight mb-1">{kpi.value}</span>
            <span className="text-[11px] uppercase font-black text-slate-500 tracking-widest">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* 3. PERFORMANCE LINE CHART */}
        <div className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl flex flex-col group hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-white text-xl flex items-center gap-3">
              <TrendingUp className="text-brand-400" size={24} /> Combat Velocity
            </h3>
            <span className="text-[10px] uppercase tracking-widest px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-black shadow-inner">
              Past 7 Days
            </span>
          </div>
          <div className="h-72 w-full flex-1 relative">
            <Line ref={chartRef} data={performanceData} options={chartOptions} />
          </div>
        </div>

        {/* 4. SYLLABUS WEIGHTAGE PROGRESS */}
        <div className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-slate-700/50 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
            <h3 className="font-black text-white text-xl flex items-center gap-3">
              <Target className="text-rose-400" size={24} /> Syllabus Coverage
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
              Weightage Index
            </span>
          </div>
          
          <div className="space-y-6 pr-2 max-h-[350px] overflow-y-auto custom-scrollbar">
            {syllabusModules.map((mod, idx) => {
              const percentage = (mod.covered / mod.weightage) * 100;
              const isComplete = percentage >= 100;
              
              return (
                <div key={idx} className="group">
                  <div className="flex justify-between items-end mb-2.5">
                    <span className={`text-sm font-black transition-colors ${isComplete ? 'text-emerald-400' : 'text-slate-200 group-hover:text-white'}`}>
                      {mod.name}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {mod.covered} / {mod.weightage} Mks
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 shadow-inner relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${
                        isComplete ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                        : 'bg-gradient-to-r from-brand-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                      {/* Animated Shimmer Effect */}
                      <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                    </div>
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