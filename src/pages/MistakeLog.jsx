import { useState, useEffect } from 'react';
import { BrainCircuit, AlertOctagon, Target, ShieldAlert, Trash2 } from 'lucide-react';

export default function MistakeLog() {
  const [mistakes, setMistakes] = useState([]);

  useEffect(() => {
    // Load mistakes from the Game Engine's local storage
    const savedMistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
    setMistakes(savedMistakes);
  }, []);

  const clearLog = () => {
    if(window.confirm("Are you sure you want to clear your mistake memory?")) {
      localStorage.removeItem('psc_mistakes');
      setMistakes([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      <div className="bg-civil-card/70 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-rose-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-rose-950/20 shadow-xl flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><BrainCircuit size={28} /></div>
            <h1 className="text-3xl font-black text-white">Important Points to Remember</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xl">
            This is your personalized weakness log. It automatically captures every question and trap you fall for during the Purgatory Drills so you never make the same mistake twice.
          </p>
        </div>
        
        {mistakes.length > 0 && (
          <button onClick={clearLog} className="p-3 text-rose-400 hover:bg-rose-500/20 rounded-xl transition border border-transparent hover:border-rose-500/30 flex items-center gap-2 text-sm font-bold">
            <Trash2 size={16}/> Clear Memory
          </button>
        )}
      </div>

      {mistakes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert size={32} /></div>
          <h3 className="text-xl font-bold text-white mb-2">Your record is spotless!</h3>
          <p className="text-slate-400">Play some daily drills. Any mistakes you make will automatically appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {mistakes.map((mistake, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-700 hover:border-rose-500/50 transition p-6 rounded-2xl shadow-lg flex gap-4 items-start">
              <div className="mt-1">
                {mistake.type === 'mcq' ? <Target className="text-rose-400" size={24}/> : <AlertOctagon className="text-amber-400" size={24}/>}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">
                  {mistake.type === 'mcq' ? 'PSC Combat Mistake' : 'Spot The Trap Mistake'}
                </span>
                <h3 className="text-lg font-bold text-slate-200 mb-3">
                  {mistake.question || mistake.statement}
                </h3>
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">Correct Answer / Fact:</span>
                  <p className="text-emerald-100 font-semibold">{mistake.correct || mistake.fact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}