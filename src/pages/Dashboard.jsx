import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { HardHat, Target, Check, Brain, Layers, Bolt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();

  // Radar Chart Configuration strictly mapped to Kerala PSC Modules
  const radarData = {
    labels: ['Structural', 'Geotech', 'Fluid Mech', 'Environmental', 'Surveying', 'Transportation', 'Concrete & Building'],
    datasets: [
      {
        label: 'Mastery Level (%)',
        data: [82, 65, 74, 58, 90, 70, 88], // We will pull this from Firebase later
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        pointBackgroundColor: '#fbbf24',
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: '#334155' },
        grid: { color: '#1e293b' },
        pointLabels: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
        ticks: { display: false, backdropColor: 'transparent' },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="space-y-6">
      {/* Rank Progression Banner */}
      <div className="bg-civil-card/70 backdrop-blur-md p-6 rounded-2xl relative overflow-hidden border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 text-xs font-semibold">
              <HardHat size={14} /> Current Designation Track
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Target: <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-amber-200">Assistant Engineer (PWD)</span>
            </h2>
            <p className="text-slate-400 text-sm">
              Complete your daily Purgatory drills, review IS code flashcards, and pass weekend mock exams to promote your rank from Site Supervisor to AE!
            </p>
          </div>

          {/* Mini XP Widget */}
          <div className="w-full md:w-80 bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">Current Rank:</span>
              <span className="text-brand-400">Overseer Gr-I</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div className="bg-gradient-to-r from-brand-600 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: '72.5%' }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Level 3</span>
              <span>1450 / 2000 XP</span>
              <span>Level 4 (AE)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for Chart and Daily Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subject Mastery Radar */}
        <div className="bg-civil-card p-5 rounded-2xl border border-civil-border space-y-4 lg:col-span-2 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Target className="text-brand-400" size={18} /> Subject Weightage Mastery
            </h3>
            <span className="text-xs text-slate-400">Based on recent quizzes</span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        {/* Daily Goals & Quick Actions */}
        <div className="bg-civil-card p-5 rounded-2xl border border-civil-border space-y-4 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Check className="text-emerald-400" size={18} /> Daily PSC AE Target
            </h3>
            
            <div className="space-y-3">
              {/* Goal 1: Done */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Check size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Clear 'Purgatory' Drill</div>
                    <div className="text-[11px] text-slate-400">+100 XP Reward</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400">Done</span>
              </div>

              {/* Goal 2: Action Needed */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Brain size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Ask AI 1 Concept</div>
                    <div className="text-[11px] text-slate-400">+50 XP Reward</div>
                  </div>
                </div>
                <button onClick={() => navigate('/tutor')} className="px-2.5 py-1 text-xs bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-lg transition">Ask AI</button>
              </div>

              {/* Goal 3: Action Needed */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Layers size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Review 5 IS Codes</div>
                    <div className="text-[11px] text-slate-400">+50 XP Reward</div>
                  </div>
                </div>
                <button onClick={() => navigate('/vault')} className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition">Start</button>
              </div>
            </div>
          </div>

          {/* Main Call to Action */}
          <button onClick={() => navigate('/daily')} className="w-full py-3 bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition active:scale-95">
            <Bolt size={18} /> Launch Daily Mission Sequence
          </button>
        </div>
      </div>
    </div>
  );
}