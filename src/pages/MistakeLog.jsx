import { useState, useEffect } from 'react';
import { History, CheckCircle2, RotateCcw, Target, AlertOctagon, BrainCircuit, Lock, ChevronDown, Lightbulb, Clock } from 'lucide-react';
import GameEngine from '../components/GameEngine';
import { useAuth } from '../context/AuthContext';

export default function MistakeLog() {
  const [mistakes, setMistakes] = useState([]);
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillCurriculum, setDrillCurriculum] = useState(null); 
  
  // UI Optimization
  const [visibleCount, setVisibleCount] = useState(15);

  // Pull cloud data directly
  const { mistakes: cloudMistakes, profile, updateCloudProgress } = useAuth();

  useEffect(() => {
    // 1. Load Mistakes from Cloud
    if (cloudMistakes) {
      const formatted = cloudMistakes.map(m => ({
        ...m,
        streak: m.streak || 0,
        correct_answer: m.correct_answer || m.correct || m.fact || "Answer missing",
      })).reverse(); 
      
      setMistakes(formatted);
    }
  }, [cloudMistakes]);

  // 🚀 THE NEW SPACED REPETITION ENGINE (Per-Question Cooldown)
  const now = new Date().getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const processedMistakes = mistakes.filter(m => m.streak < 3).map(m => {
    // Find the date this mistake was added or last attempted
    const referenceDate = m.lastAttempted || m.timestamp || m.date || m.createdAt;
    
    let isLocked = false;
    let daysLeft = 0;
    
    if (referenceDate) {
      const timeSinceAdded = now - new Date(referenceDate).getTime();
      if (timeSinceAdded < SEVEN_DAYS_MS) {
        isLocked = true;
        daysLeft = Math.ceil((SEVEN_DAYS_MS - timeSinceAdded) / (1000 * 60 * 60 * 24));
      }
    }
    
    return { ...m, isLocked, daysLeft };
  });

  const readyMistakes = processedMistakes.filter(m => !m.isLocked);
  const lockedMistakes = processedMistakes.filter(m => m.isLocked);
  const masteredCount = profile?.masteredCount || 0;

  // 🚀 SHUFFLE ENGINE: Only pulls from "Ready" questions
  const launchShuffledDrill = () => {
    let preparedQuestions = readyMistakes.map(m => {
      const isTrap = m.type === 'trap' || !m.options || m.options.length === 0;
      let finalOptions = [];
      let finalCorrect = "";

      if (isTrap) {
        const isFact = String(m.correct_answer).toLowerCase().includes("fact") || String(m.correct_answer).toLowerCase().includes("true") || m.correct_answer === true;
        finalOptions = ["FACT (True)", "TRAP (False)"]; 
        finalCorrect = isFact ? "FACT (True)" : "TRAP (False)";
      } else {
        // Shuffle the 4 MCQ Options
        finalOptions = [...m.options];
        for (let i = finalOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalOptions[i], finalOptions[j]] = [finalOptions[j], finalOptions[i]];
        }
        finalCorrect = m.correct_answer;
      }

      return {
        question: m.statement || m.question || "Unknown Statement",
        options: finalOptions,
        correct_answer: finalCorrect,
        explanation: m.explanation || "Review this concept carefully."
      };
    });

    // Shuffle the overall Questions array
    for (let i = preparedQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [preparedQuestions[i], preparedQuestions[j]] = [preparedQuestions[j], preparedQuestions[i]];
    }

    // FATIGUE CAP: Limit to 20 random questions per drill max
    const cappedQuestions = preparedQuestions.slice(0, 20);

    setDrillCurriculum({
      isRemedial: true,
      timeLimitMinutes: Math.ceil(cappedQuestions.length * 1.5),
      quizzes: cappedQuestions
    });
    
    setIsDrillActive(true);
  };

  const handleDrillComplete = (gameType, sessionLog) => {
    if (!sessionLog) return;

    let newlyMastered = 0;

    // Update Streaks and Timestamps based on what was right/wrong
    let updatedMistakes = mistakes.map(mistake => {
      const mistakeText = mistake.question || mistake.statement;
      const gotCorrect = sessionLog.correct.some(q => q.question === mistakeText);
      const gotWrong = sessionLog.incorrect.some(q => q.question === mistakeText);

      // 🚀 If they answered it in this drill, update its specific timestamp to lock it for 7 days
      if (gotCorrect || gotWrong) {
        let newStreak = mistake.streak || 0;
        
        if (gotCorrect) {
          newStreak += 1;
          if (newStreak >= 3) newlyMastered++;
        } else {
          newStreak = 0; // Reset streak to 0 if they fail
        }

        return { 
          ...mistake, 
          streak: newStreak, 
          lastAttempted: new Date().toISOString() // 🚀 This triggers the 7-day per-question cooldown!
        };
      }
      
      return mistake;
    });

    // PERMANENT DELETION: Instantly remove anything with 3 streaks
    updatedMistakes = updatedMistakes.filter(m => (m.streak || 0) < 3);

    // Update local UI instantly
    setMistakes(updatedMistakes);
    
    // FIREBASE SYNC: Save all changes directly to the cloud
    updateCloudProgress({
      mistakes: updatedMistakes.reverse(), // Keep chronological order in DB
      masteredCount: parseInt(masteredCount) + newlyMastered
    });
  };

  if (isDrillActive && drillCurriculum) {
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
            curriculumData={drillCurriculum} 
            onExit={() => { setIsDrillActive(false); setDrillCurriculum(null); }} 
            onMarkComplete={handleDrillComplete}
            isExamMode={false} 
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
            <p className="text-base text-slate-400 font-medium ml-1 max-w-lg">
              Spaced repetition engine. Review your errors below. Clear a mistake 3 consecutive times in the Remedial Drill to permanently archive it. New errors lock for 7 days.
            </p>
          </div>
          
          {/* 🚀 UPGRADED: 3 Stat Blocks to show Ready vs Locked */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center shadow-inner min-w-[100px]">
              <span className="block text-2xl font-black text-rose-400">{processedMistakes.length}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Errors</span>
            </div>
            <div className="bg-sky-950/20 p-4 rounded-2xl border border-sky-900/50 text-center shadow-inner min-w-[100px]">
              <span className="block text-2xl font-black text-sky-400">{readyMistakes.length}</span>
              <span className="text-[10px] font-black text-sky-600/80 uppercase tracking-widest">Ready to Drill</span>
            </div>
            <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-900/50 text-center shadow-inner min-w-[100px]">
              <span className="block text-2xl font-black text-emerald-400">{masteredCount}</span>
              <span className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest">Mastered</span>
            </div>
          </div>
        </div>
      </div>

      {processedMistakes.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-2">
            <h3 className="text-xl font-black text-white flex items-center gap-2"><Target className="text-amber-400" /> Pending Remediation</h3>
            
            {/* 🚀 NEW: Dynamic Per-Question Launch Button */}
            {readyMistakes.length > 0 ? (
              <button onClick={launchShuffledDrill} className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition active:scale-95 flex items-center gap-2">
                <BrainCircuit size={18} /> Launch Drill ({readyMistakes.length} Ready)
              </button>
            ) : (
              <button disabled className="px-6 py-3 bg-slate-950 border border-slate-800 text-slate-500 font-black rounded-xl transition flex items-center gap-2 cursor-not-allowed">
                <Lock size={18} /> All {lockedMistakes.length} Mistakes in Cooldown
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {processedMistakes.slice(0, visibleCount).map((mistake, idx) => (
              <div key={idx} className={`bg-slate-900/60 backdrop-blur-md border p-6 rounded-3xl flex flex-col md:flex-row justify-between gap-6 group transition-colors ${mistake.isLocked ? 'border-slate-800 opacity-80' : 'border-slate-700/50 hover:border-slate-500'}`}>
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${mistake.type === 'trap' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {mistake.type === 'trap' ? 'Spot The Trap Mistake' : 'Combat Mistake'}
                    </span>
                    
                    {/* 🚀 NEW: Cooldown Status Badge */}
                    {mistake.isLocked ? (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                        <Lock size={12} /> Cooling Down ({mistake.daysLeft}d left)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                        <Clock size={12} /> Ready to Drill
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-bold text-white mb-4 leading-relaxed">{mistake.question || mistake.statement}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Correct Answer / Fact:</span>
                      <p className="text-emerald-100 font-semibold">{mistake.correct_answer}</p>
                    </div>

                    {mistake.explanation && (
                      <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl">
                        <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest block mb-1 flex items-center gap-1"><Lightbulb size={12}/> Context:</span>
                        <p className="text-slate-300 text-sm">{mistake.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>

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

          {/* Load More Pagination */}
          {visibleCount < processedMistakes.length && (
            <div className="flex justify-center pt-4">
              <button 
                onClick={() => setVisibleCount(prev => prev + 15)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2 shadow-lg"
              >
                <ChevronDown size={16} /> Load Older Mistakes
              </button>
            </div>
          )}

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