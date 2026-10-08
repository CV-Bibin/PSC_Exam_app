import { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Clock, Loader2 } from 'lucide-react';

export default function LiveQuizTab() {
  const [liveTitle, setLiveTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

  const handleScheduleLiveQuiz = async () => {
    if (!liveTitle || !startTime || !endTime) {
      setLiveStatus('⚠️ Please fill out the title and both time fields.');
      return;
    }
    setIsPublishingLive(true);
    setLiveStatus('Deploying Live Quiz configuration...');

    try {
      await addDoc(collection(db, 'live_quizzes'), {
        title: liveTitle,
        scheduledStartTime: new Date(startTime).toISOString(),
        scheduledEndTime: new Date(endTime).toISOString(),
        status: 'upcoming',
        maxScore: 100,
        questions: [], 
        createdAt: serverTimestamp()
      });
      setLiveStatus('✅ Live Quiz Scheduled Successfully!');
      setLiveTitle('');
      setStartTime('');
      setEndTime('');
    } catch (error) {
      setLiveStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsPublishingLive(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-civil-card border border-civil-border p-8 rounded-3xl shadow-xl animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><Target size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-white">Live Competitive Exam Setup</h2>
          <p className="text-sm text-slate-400">Schedule a global synchronous exam with strict time limits.</p>
        </div>
      </div>

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Title</label>
          <input type="text" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="e.g. KWA Overseer Grand Mock 1" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> Start Time</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> End Time</label>
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition [color-scheme:dark]" />
          </div>
        </div>
      </div>

      <button onClick={handleScheduleLiveQuiz} disabled={isPublishingLive} className="w-full py-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.2)] transition flex items-center justify-center gap-2">
        {isPublishingLive ? <><Loader2 className="animate-spin" size={20} /> Scheduling Event...</> : <><Target size={20} /> Schedule Live Exam</>}
      </button>

      {liveStatus && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-bold border ${liveStatus.includes('❌') || liveStatus.includes('⚠️') ? 'bg-rose-950/30 border-rose-500/50 text-rose-400' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'}`}>
          {liveStatus}
        </div>
      )}
    </div>
  );
}