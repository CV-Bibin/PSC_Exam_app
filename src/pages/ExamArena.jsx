import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  Swords, Trophy, Target, Clock, BrainCircuit, Play, 
  CheckCircle2, RotateCcw, Search, BarChart3, Radio, FileText, Filter
} from 'lucide-react';

export default function ExamArena() {
  const navigate = useNavigate();
  const [weeklyMocks, setWeeklyMocks] = useState([]);
  const [grandMocks, setGrandMocks] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Pro Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'completed'

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

  // Pro-level Status Evaluator
  const getExamStatus = (examId) => {
    const completedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
    if (completedExams.includes(examId)) {
      return { id: 'completed', label: 'Mission Accomplished', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2, btnText: 'Review Log', btnClass: 'bg-slate-800 text-emerald-400 hover:bg-emerald-950 border border-emerald-900/50' };
    }
    
    const savedState = JSON.parse(localStorage.getItem(`psc_exam_state_${examId}`));
    if (savedState && !savedState.isFinished && savedState.currentIndex > 0) {
      return { id: 'progress', label: 'In Progress', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: RotateCcw, btnText: 'Resume Assessment', btnClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
    }
    
    return { id: 'new', label: 'Pending Access', color: 'text-brand-400 bg-brand-500/10 border-brand-500/30', icon: Target, btnText: 'Initiate Assessment', btnClass: 'bg-brand-500 hover:bg-brand-400 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
  };

  // Filter & Search Logic
  const filterExams = (examsList) => {
    return examsList.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getExamStatus(exam.id).id;
      const matchesFilter = activeFilter === 'all' || 
                            (activeFilter === 'completed' && status === 'completed') || 
                            (activeFilter === 'pending' && status !== 'completed');
      return matchesSearch && matchesFilter;
    });
  };

  const filteredGrandMocks = useMemo(() => filterExams(grandMocks), [grandMocks, searchQuery, activeFilter]);
  const filteredWeeklyMocks = useMemo(() => filterExams(weeklyMocks), [weeklyMocks, searchQuery, activeFilter]);

  // Statistics Aggregation
  const totalExams = grandMocks.length + weeklyMocks.length;
  const completedExamsCount = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]').length;
  const pendingExamsCount = totalExams - completedExamsCount;

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. ARENA HEADER & STATS (Pro Dashboard Feel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-3xl shadow-2xl flex items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="p-5 bg-brand-500/10 rounded-2xl text-brand-400 border border-brand-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative z-10">
            <Swords size={40} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white tracking-tight">Statewide Assessment Arena</h2>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">Engage in highly calibrated PSC simulations. Your performance here dictates your readiness for the final rank file.</p>
          </div>
        </div>

        <div className="bg-civil-card border border-civil-border p-6 rounded-3xl shadow-xl flex flex-col justify-center gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16}/> Readiness Overview</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
              <span className="block text-2xl font-black text-brand-400">{pendingExamsCount}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</span>
            </div>
            <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-900/50 text-center">
              <span className="block text-2xl font-black text-emerald-400">{completedExamsCount}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-[70px] z-20 shadow-lg backdrop-blur-md bg-slate-900/90">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search assessments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-sm font-bold text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-brand-500 transition placeholder:text-slate-600"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <Filter size={16} className="text-slate-500 mr-2 shrink-0" />
          <FilterButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} label="All Assessments" />
          <FilterButton active={activeFilter === 'pending'} onClick={() => setActiveFilter('pending')} label="Pending" />
          <FilterButton active={activeFilter === 'completed'} onClick={() => setActiveFilter('completed')} label="Completed" />
        </div>
      </div>

      {/* 3. LIVE EVENTS (Only shows if there are live exams) */}
      {liveExams.length > 0 && activeFilter === 'all' && !searchQuery && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Radio className="text-rose-500 animate-pulse" /> Live Competitions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveExams.map(exam => {
              const startDate = new Date(exam.scheduledStartTime);
              const isNow = startDate <= new Date() && new Date() <= new Date(exam.scheduledEndTime);
              
              return (
                <div key={exam.id} className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${isNow ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_30px_rgba(225,29,72,0.15)]' : 'bg-slate-900 border-slate-800'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isNow ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.5)]' : 'bg-slate-800 text-slate-400'}`}>
                        {isNow ? 'LIVE NOW' : 'Scheduled'}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">{exam.title}</h4>
                    <p className="text-sm font-semibold text-slate-400 mb-6 flex items-center gap-2"><Clock size={16}/> Starts: {startDate.toLocaleString()}</p>
                  </div>
                  <button disabled={!isNow} className={`w-full py-4 rounded-xl font-black text-sm transition flex justify-center items-center gap-2 ${isNow ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
                    {isNow ? <><Play size={18} /> Enter Live Arena</> : <><Clock size={18} /> Awaiting Deployment</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODULE MASTERY EXAMS (Previously Grand Mocks) */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Trophy className="text-amber-400" /> Module Mastery Assessments
        </h3>
        {filteredGrandMocks.length === 0 ? (
          <EmptyState message="No Mastery Assessments match your criteria. Complete daily modules to unlock them." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGrandMocks.map(mock => {
              const status = getExamStatus(mock.id);
              return (
                <div key={mock.id} className="bg-civil-card border-2 border-civil-border p-6 rounded-3xl hover:border-brand-500/40 transition-all flex flex-col justify-between group shadow-lg">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-black text-white pr-4 leading-tight group-hover:text-brand-400 transition-colors">{mock.title}</h4>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 ${status.color}`}>
                        <status.icon size={14} /> {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-5 text-sm font-bold text-slate-400 mb-8 bg-slate-900/50 inline-flex p-3 rounded-xl border border-slate-800">
                      <span className="flex items-center gap-2"><FileText size={16} className="text-brand-500" /> {mock.totalQuestions} Questions</span>
                      <div className="w-px h-4 bg-slate-700"></div>
                      <span className="flex items-center gap-2"><Clock size={16} className="text-amber-500" /> {mock.timeLimitMinutes} Mins Time Limit</span>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/exam/${mock.id}`)} className={`w-full py-4 rounded-xl transition flex items-center justify-center gap-2 text-sm ${status.btnClass}`}>
                    {status.btnText}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. GLOBAL PSC SIMULATIONS (Previously Weekly Mocks) */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <BrainCircuit className="text-emerald-400" /> Global PSC Simulations
        </h3>
        {filteredWeeklyMocks.length === 0 ? (
          <EmptyState message="No simulations match your current filters." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWeeklyMocks.map(mock => {
              const status = getExamStatus(mock.id);
              return (
                <div key={mock.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between hover:border-slate-600 transition-colors shadow-lg">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-black text-white text-base leading-snug">{mock.title}</h4>
                      <div className={`p-1.5 rounded-lg border ${status.color.split(' ')[1]} ${status.color.split(' ')[2]}`} title={status.label}>
                        <status.icon size={16} className={status.color.split(' ')[0]} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">
                      <span>{mock.totalQuestions} Qs</span><span>•</span><span>{mock.timeLimitMinutes} Mins</span>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/exam/${mock.id}`)} className={`w-full py-3 font-black text-xs rounded-xl transition ${status.btnClass}`}>
                    {status.btnText}
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
      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${
        active ? 'bg-brand-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-950 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-10 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed text-slate-500 text-sm font-semibold flex flex-col items-center justify-center text-center gap-3">
      <Search size={32} className="text-slate-700" />
      {message}
    </div>
  );
}