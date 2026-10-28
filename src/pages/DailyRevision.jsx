import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FastForward, CheckCircle2, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function DailyRevision() {
  const [completedMissions, setCompletedMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 Optimization States
  const [visibleCount, setVisibleCount] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const snap = await getDocs(collection(db, 'daily_tasks'));
        if (!snap.empty) {
          const tasks = snap.docs.map(doc => doc.data());
          const storedCompletedDays = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
          
          const finishedTasks = tasks
            .filter(task => storedCompletedDays.includes(task.dayNumber))
            .sort((a, b) => b.dayNumber - a.dayNumber); // Newest first
            
          setCompletedMissions(finishedTasks);
          
          // Auto-expand the most recent day if there are any completed missions
          if (finishedTasks.length > 0) {
            setExpandedDay(finishedTasks[0].dayNumber);
          }
        }
      } catch (error) {
        console.error("Error loading missions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRevisions();
  }, []);

  // 🚀 Fast client-side searching
  const filteredMissions = useMemo(() => {
    return completedMissions.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.dayNumber.toString().includes(searchQuery)
    );
  }, [completedMissions, searchQuery]);

  const visibleMissions = filteredMissions.slice(0, visibleCount);

  const toggleDay = (dayNum) => {
    setExpandedDay(prev => prev === dayNum ? null : dayNum);
  };

  if (isLoading) return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;

  if (completedMissions.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 max-w-4xl mx-auto mt-10">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
        <h3 className="text-xl font-bold text-white mb-2">No revisions available yet.</h3>
        <p className="text-slate-400">Complete your first Daily Sequence to unlock your Cheat Sheets here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-16">
      
      {/* HEADER */}
      <div className="bg-civil-card/70 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><FastForward size={28} /></div>
            <h1 className="text-3xl font-black text-white">Master Revision Table</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xl">
            Quickly review the high-yield one-liners from all your completed days. Consistent spaced repetition is the key to cracking the PSC exam.
          </p>
        </div>

        {/* 🚀 SEARCH BAR */}
        <div className="relative w-full md:w-[300px] shrink-0">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
          <input 
            type="text" 
            placeholder="Search topics or day #..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(15); // Reset visible count on new search
            }}
            className="w-full bg-slate-950/80 border border-emerald-900/50 text-sm font-bold text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-emerald-500 transition shadow-inner placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* REVISION ACCORDION LIST */}
      {filteredMissions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 font-bold border border-slate-800 border-dashed rounded-2xl">
          No records found matching "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMissions.map((mission) => {
            const isExpanded = expandedDay === mission.dayNumber;

            return (
              <div key={mission.dayNumber} className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800 shadow-md hover:border-slate-600'}`}>
                
                {/* 🚀 CLICKABLE HEADER */}
                <button 
                  onClick={() => toggleDay(mission.dayNumber)}
                  className="w-full bg-slate-950/50 p-4 md:px-6 flex items-center justify-between text-left transition hover:bg-slate-800/30"
                >
                  <h2 className="text-lg font-bold text-white flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border transition-colors ${isExpanded ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-brand-500/20 text-brand-400 border-brand-500/30'}`}>
                      Day {mission.dayNumber}
                    </span>
                    <span className="line-clamp-1">{mission.title}</span>
                  </h2>
                  <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                
                {/* 🚀 COLLAPSIBLE BODY */}
                {isExpanded && (
                  <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
                    <ul className="space-y-3">
                      {mission.curriculumData?.quick_revision?.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-4 p-3 hover:bg-slate-800/50 rounded-xl transition">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-2"></div>
                          <span className="text-base text-slate-300 font-semibold leading-relaxed">{point}</span>
                        </li>
                      ))}
                      {(!mission.curriculumData?.quick_revision || mission.curriculumData.quick_revision.length === 0) && (
                        <p className="text-slate-500 text-sm italic">No quick revision points available for this day.</p>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🚀 LOAD MORE BUTTON */}
      {visibleCount < filteredMissions.length && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => setVisibleCount(prev => prev + 15)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2"
          >
            <ChevronDown size={16} /> Load Older Revisions
          </button>
        </div>
      )}

    </div>
  );
}