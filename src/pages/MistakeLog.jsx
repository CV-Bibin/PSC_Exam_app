import { useState, useEffect } from 'react';
import { History, CheckCircle2, RotateCcw, Target, AlertOctagon, BrainCircuit } from 'lucide-react';
import GameEngine from '../components/GameEngine';

export default function MistakeLog() {
  const [mistakes, setMistakes] = useState([]);
  const [isDrillActive, setIsDrillActive] = useState(false);

  useEffect(() => {
    const loadMistakes = () => {
      const stored = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
      
      const formatted = stored.map(m => ({
        ...m,
        streak: m.streak || 0,
        // Unify the correct answer property from older database formats
        correct_answer: m.correct_answer || m.correct || m.fact || "Answer missing",
      }));
      setMistakes(formatted);
    };
    loadMistakes();
  }, []);

  // Filter out mistakes that have been answered correctly 3 times in a row
  const activeMistakes = mistakes.filter(m => m.streak < 3);
  const masteredCount = mistakes.length - activeMistakes.length;

  const handleDrillComplete = (gameType, sessionLog) => {
    if (!sessionLog) {
      setIsDrillActive(false);
      return;
    }

    const updatedMistakes = mistakes.map(mistake => {
      // Check if they got this specific mistake right or wrong based on either question or statement
      const mistakeText = mistake.question || mistake.statement;
      const gotCorrect = sessionLog.correct.some(q => q.question === mistakeText);
      const gotWrong = sessionLog.incorrect.some(q => q.question === mistakeText);

      if (gotCorrect) {
        return { ...mistake, streak: (mistake.streak || 0) + 1 };
      } else if (gotWrong) {
        return { ...mistake, streak: 0 }; // Reset streak on failure
      }
      return mistake;
    });

    setMistakes(updatedMistakes);
    localStorage.setItem('psc_mistakes', JSON.stringify(updatedMistakes));
    setIsDrillActive(false);
  };

  if (isDrillActive) {
    // 🚀 NEW: Smart Normalizer
    // This safely converts both MCQ and Trap mistakes into valid GameEngine format
    const remedialCurriculum = {
      isRemedial: true, 
      timeLimitMinutes: Math.ceil(activeMistakes.length * 1.5), 
      quizzes: activeMistakes.map(m => {
        const isTrap = m.type === 'trap' || !m.options || m.options.length === 0;

        if (isTrap) {
          // Convert Trap into a 2-option MCQ
          const isFact = String(m.correct_answer).toLowerCase().includes("fact") || String(m.correct_answer).toLowerCase().includes("true") || m.correct_answer === true;
          
          return {
            question: m.statement || m.question || "Unknown Statement",
            options: ["FACT (True)", "TRAP (False)"],
            correct_answer: isFact ? "FACT (True)" : "TRAP (False)",
            explanation: m.explanation || "Review this concept carefully."
          };
        }

        // Standard MCQ
        return {
          question: m.question || m.statement || "Unknown Question",
          options: m.options,
          correct_answer: m.correct_answer,
          explanation: m.explanation || "Review this concept carefully."
        };
      })
    };

    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)]">
        <div className="mb-4 flex items-center justify-between bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl shadow-lg">
          <h1 className="font-black text-amber-400 text-lg flex items-center gap-2">
            <RotateCcw size={20}/> Remedial Protocol Active
          </h1>
        </div>
        <div className="bg-civil-card border border-civil-border rounded-[2rem] shadow-2xl h-[calc(100%-5rem)] p-6 overflow-y-auto">
          <GameEngine 
            gameType="mcq" 
            curriculumData={remedialCurriculum} 
            onExit={() => setIsDrillActive(false)} 
            onMarkComplete={handleDrillComplete}
            isExamMode={false} // Immediate feedback during remedial drills
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-700/50 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30 shadow-inner">
                <History size={32} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Mistake Log & Mastery</h1>
            </div>
            <p className="text-base text-slate-400 font-medium ml-1">Spaced repetition engine. Clear an error 3 consecutive times to archive it.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center shadow-inner">
              <span className="block text-2xl font-black text-rose-400">{activeMistakes.length}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Errors</span>
            </div>
            <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-900/50 text-center shadow-inner">
              <span className="block text-2xl font-black text-emerald-400">{masteredCount}</span>
              <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest">Mastered</span>
            </div>
          </div>
        </div>
      </div>

      {activeMistakes.length > 0 ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black text-white flex items-center gap-2"><Target className="text-amber-400" /> Pending Remediation</h3>
            <button onClick={() => setIsDrillActive(true)} className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition active:scale-95 flex items-center gap-2">
              <BrainCircuit size={18} /> Launch Remedial Drill
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeMistakes.map((mistake, idx) => (
              <div key={idx} className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl flex flex-col md:flex-row justify-between gap-6 group hover:border-slate-500 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${mistake.type === 'trap' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {mistake.type === 'trap' ? 'Spot The Trap Mistake' : 'Combat Mistake'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-4 leading-relaxed">{mistake.question || mistake.statement}</h4>
                  
                  <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Correct Answer / Fact:</span>
                    <p className="text-emerald-100 font-semibold">{mistake.correct_answer}</p>
                  </div>
                </div>

                {/* 3-Strike Mastery Tracker */}
                <div className="shrink-0 flex flex-col items-center justify-center bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner md:w-48">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Mastery Streak</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(strike => (
                      <div key={strike} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        (mistake.streak || 0) >= strike 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                          : 'bg-slate-900 border-slate-700 text-transparent'
                      }`}>
                        {(mistake.streak || 0) >= strike && <CheckCircle2 size={14} strokeWidth={4} />}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 font-bold">{(mistake.streak || 0)} / 3 Correct</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-900/40 rounded-[2.5rem] border border-slate-800 border-dashed">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">No Active Mistakes</h3>
          <p className="text-slate-400 max-w-md">Your operational record is completely clear. Complete more daily missions or exams to identify new tactical weaknesses.</p>
        </div>
      )}
    </div>
  );
}