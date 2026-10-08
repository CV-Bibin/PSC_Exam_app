import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FastForward, CheckCircle2 } from 'lucide-react';

export default function DailyRevision() {
  const [completedMissions, setCompletedMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const snap = await getDocs(collection(db, 'daily_tasks'));
        if (!snap.empty) {
          const tasks = snap.docs.map(doc => doc.data());
          const storedCompletedDays = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
          
          // Filter to only show missions the user has actually completed
          const finishedTasks = tasks
            .filter(task => storedCompletedDays.includes(task.dayNumber))
            .sort((a, b) => b.dayNumber - a.dayNumber); // Show newest completed day first
            
          setCompletedMissions(finishedTasks);
        }
      } catch (error) {
        console.error("Error loading missions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRevisions();
  }, []);

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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="bg-civil-card/70 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><FastForward size={28} /></div>
          <h1 className="text-3xl font-black text-white">Master Revision Table</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-xl">
          Quickly review the high-yield one-liners from all your completed days. Consistent spaced repetition is the key to cracking the PSC exam.
        </p>
      </div>

      <div className="space-y-6">
        {completedMissions.map((mission) => (
          <div key={mission.dayNumber} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-950/50 border-b border-slate-800 p-4 md:px-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-500/20 text-brand-400 rounded-lg text-xs font-black uppercase tracking-widest border border-brand-500/30">
                  Day {mission.dayNumber}
                </span>
                {mission.title}
              </h2>
            </div>
            
            <div className="p-4 md:p-6">
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
          </div>
        ))}
      </div>
    </div>
  );
}