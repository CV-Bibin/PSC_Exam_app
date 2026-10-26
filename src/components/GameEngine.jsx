import { useState, useEffect } from 'react';
import { Target, Layers, ShieldAlert, CheckCircle2, XCircle, ArrowRight, RotateCw, Trophy, Eye, RefreshCw, ArrowLeft } from 'lucide-react';
import TacticalTimer from './TacticalTimer';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function GameEngine({ gameType, curriculumData, onExit, onMarkComplete, isExamMode = false, forceReviewMode = false, examId = 'default' }) {
  
  // 🚀 SYNCHRONOUS INITIALIZATION: Prevents the UI from flashing Question 1 and triggering false attempts
  const [isReviewMode, setIsReviewMode] = useState(forceReviewMode);
  const [isExamSubmitted, setIsExamSubmitted] = useState(forceReviewMode);

  const [userAnswers, setUserAnswers] = useState(() => {
    if (forceReviewMode) {
      const hist = JSON.parse(localStorage.getItem(`psc_exam_history_${examId}`));
      return hist?.answers || {};
    }
    return {};
  });

  const [score, setScore] = useState(() => {
    if (forceReviewMode) {
      const hist = JSON.parse(localStorage.getItem(`psc_exam_history_${examId}`));
      return hist?.score || 0;
    }
    return 0;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [mistakes, setMistakes] = useState([]); 
  const [sessionLog, setSessionLog] = useState({ correct: [], incorrect: [] });
  const [isFlipped, setIsFlipped] = useState(false); 

  const gameData = 
    gameType === 'mcq' ? curriculumData?.quizzes || [] :
    gameType === 'flashcards' ? curriculumData?.games?.flashcards || [] :
    gameType === 'trap' ? curriculumData?.games?.spot_the_trap || [] : [];

  const isFinished = isExamMode ? isExamSubmitted : (currentIndex >= gameData.length);

  // 🚀 DYNAMIC ATTEMPT CALCULATION
  const maxAllowed = curriculumData?.maxAttempts === 'unlimited' ? Infinity : (curriculumData?.maxAttempts || 1);
  const currentAttempts = curriculumData?.currentAttempts || 0;
  // If they just submitted, we subtract 1 so the button hides immediately when they hit 0
  const remainingAfterSubmit = forceReviewMode ? (maxAllowed - currentAttempts) : (maxAllowed - currentAttempts - 1);

  // 🚀 CRITICAL FIX: Sync State on Navigation
  // This prevents the bug where React remembers the old exam state when you click a different exam
  useEffect(() => {
    if (forceReviewMode) {
      const hist = JSON.parse(localStorage.getItem(`psc_exam_history_${examId}`) || 'null');
      setIsReviewMode(true);
      setIsExamSubmitted(true);
      setScore(hist?.score || 0);
      setUserAnswers(hist?.answers || {});
    } else {
      setIsReviewMode(false);
      setIsExamSubmitted(false);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers({});
      setMistakes([]);
      setShowResult(false);
      setSelectedAnswer(null);
    }
  }, [forceReviewMode, examId]);

  // Async Mistake Logging (Fires only after the exam is successfully submitted, NEVER on review)
  useEffect(() => {
    if (isFinished && gameData.length > 0 && !forceReviewMode) {
      if (!isExamMode && onMarkComplete) {
        onMarkComplete(gameType, sessionLog);
      }

      if (mistakes.length > 0 && !curriculumData?.isRemedial) {
        try {
          const existingMistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
          const newUnique = mistakes.filter(m => !existingMistakes.some(em => em.question === m.question || (m.statement && em.statement === m.statement)));

          if (newUnique.length > 0) {
            localStorage.setItem('psc_mistakes', JSON.stringify([...existingMistakes, ...newUnique]));
            addDoc(collection(db, 'users/demo_user/mistake_log'), {
              examDate: serverTimestamp(), drillType: gameType,
              mistakes_recorded: newUnique, total_errors: newUnique.length, status: 'pending_review'
            });
          }
        } catch (error) { console.error("Telemetry Error:", error); }
      }
    }
  }, [isFinished, forceReviewMode]);

  const handleFinalSubmit = () => {
    let finalScore = 0;
    let newMistakes = [];
    let log = { correct: [], incorrect: [] };

    gameData.forEach((q, idx) => {
      const studentAns = userAnswers[idx] || "Skipped";
      const targetAns = q.correct_answer || q.correct;

      if (studentAns === targetAns) {
        finalScore++;
        log.correct.push(q);
      } else {
        log.incorrect.push(q);
        newMistakes.push({
          type: 'mcq', question: q.question || q.statement, options: q.options || [],
          correct_answer: targetAns, student_answer: studentAns,
          explanation: q.explanation || "No explanation provided.", streak: 0
        });
      }
    });

    setScore(finalScore); 
    setMistakes(newMistakes); 
    setSessionLog(log); 
    setIsExamSubmitted(true);

    // Save exact answers for Tactical Review 
    localStorage.setItem(`psc_exam_history_${examId}`, JSON.stringify({
      score: finalScore, answers: userAnswers, log: log
    }));
    
    if (onMarkComplete) onMarkComplete(gameType, log);
  };

  const handleNext = () => {
    if (isExamMode) {
      if (currentIndex === gameData.length - 1) handleFinalSubmit();
      else { setSelectedAnswer(userAnswers[currentIndex + 1] || null); setCurrentIndex(prev => prev + 1); }
    } else {
      setShowResult(false); setSelectedAnswer(null); setIsFlipped(false); setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTimeUp = () => {
    if (isExamMode) handleFinalSubmit();
    else { setShowResult(true); setCurrentIndex(gameData.length); }
  };

  // ---------------------------------------------------------
  // 1. TACTICAL REVIEW UI (The Answer Key)
  // ---------------------------------------------------------
  if (isReviewMode) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 pb-10">
        <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 sticky top-0 z-20 shadow-2xl">
          <div>
            <h3 className="font-black text-white text-xl">Tactical Answer Key</h3>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Final Score: {score} / {gameData.length}</p>
          </div>
          <button 
            onClick={() => forceReviewMode ? onExit() : setIsReviewMode(false)} 
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 border border-slate-700 shadow-inner"
          >
            <ArrowLeft size={16} /> {forceReviewMode ? "Return to Arena" : "Back to Score"}
          </button>
        </div>

        <div className="space-y-6">
          {gameData.map((q, idx) => {
            const studentAns = userAnswers[idx] || "Skipped";
            const targetAns = q.correct_answer || q.correct || (q.is_true ? "FACT (True)" : "TRAP (False)");
            const isCorrect = studentAns === targetAns;

            return (
              <div key={idx} className="p-6 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {isCorrect ? <CheckCircle2 className="text-emerald-500" size={24}/> : <XCircle className="text-rose-500" size={24}/>}
                  </div>
                  <div className="w-full">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Question {idx + 1}</span>
                    <h4 className="text-lg font-bold text-white mb-4">{q.question || q.statement}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-rose-950/20 border-rose-900/50'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>Your Answer</span>
                        <p className={isCorrect ? 'text-emerald-100 font-semibold' : 'text-rose-100 font-semibold'}>{studentAns}</p>
                      </div>
                      
                      {!isCorrect && (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-1">Correct Answer</span>
                          <p className="text-white font-semibold">{targetAns}</p>
                        </div>
                      )}
                    </div>
                    
                    {q.explanation && (
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-1">Explanation</span>
                        <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 2. FINAL SCORE SCREEN (With smart Re-Attempt button)
  // ---------------------------------------------------------
  if (isFinished || gameData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95 duration-500 w-full h-full">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Assessment Concluded!</h2>
        
        {gameType !== 'flashcards' && (
          <p className="text-slate-300 text-lg mb-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl mt-4">
            You scored <span className="font-black text-4xl text-brand-400 block mt-2">{score} <span className="text-xl text-slate-500">/ {gameData.length}</span></span>
          </p>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-2">
          {isExamMode && (
            <button onClick={() => setIsReviewMode(true)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-black rounded-xl transition border border-sky-500/30 flex items-center gap-2">
              <Eye size={20} /> Review Answers
            </button>
          )}
          
          {/* Automatically hides if they exhausted attempts */}
          {isExamMode && remainingAfterSubmit > 0 && (
            <button 
              onClick={() => window.location.href = window.location.pathname} // Cleans the URL and forces fresh mount
              className="px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2"
            >
              <RefreshCw size={20} /> Re-Attempt ({remainingAfterSubmit === Infinity ? '∞' : remainingAfterSubmit} Left)
            </button>
          )}

          <button onClick={onExit} className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center gap-2">
            Return to Arena <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const currentItem = gameData[currentIndex];

  // ---------------------------------------------------------
  // 3. MCQ MODE UI
  // ---------------------------------------------------------
  if (gameType === 'mcq') {
    const targetAnswer = currentItem.correct_answer || currentItem.correct;

    const handleOptionClick = (option) => {
      if (isExamMode) {
        setSelectedAnswer(option);
        setUserAnswers(prev => ({ ...prev, [currentIndex]: option }));
      } else {
        if (showResult) return;
        setSelectedAnswer(option);
        setShowResult(true);

        if (option === targetAnswer) {
          setScore(prev => prev + 1);
          setSessionLog(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
        } else {
          setSessionLog(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
          setMistakes(prev => [...prev, { 
            type: 'mcq', question: currentItem.question, options: currentItem.options || [],
            correct_answer: targetAnswer, student_answer: option, explanation: currentItem.explanation, streak: 0
          }]);
        }
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-bold text-slate-500 bg-slate-900 px-5 py-4 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-6">
            <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white">Q {currentIndex + 1} / {gameData.length}</span>
            {!isExamMode && <span className="text-brand-400 uppercase tracking-widest">Score: {score}</span>}
          </div>
          <TacticalTimer timeLimitMinutes={curriculumData?.timeLimitMinutes || 10} onTimeUp={handleTimeUp} />
        </div>

        <h3 className="text-2xl font-black text-white leading-relaxed">{currentItem.question}</h3>
        
        <div className="space-y-4">
          {currentItem.options?.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = !isExamMode && opt === targetAnswer;
            let btnClass = "bg-slate-900 border-slate-700 hover:border-brand-500 hover:bg-slate-800 text-slate-200";
            
            if (isExamMode) {
              if (isSelected) btnClass = "bg-brand-500/20 border-brand-500 text-brand-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            } else if (showResult) {
              if (isCorrect) btnClass = "bg-emerald-950/50 border-emerald-500 text-emerald-100";
              else if (isSelected) btnClass = "bg-rose-950/50 border-rose-500 text-rose-100";
              else btnClass = "bg-slate-950 border-slate-800 text-slate-600 opacity-50";
            }

            return (
              <button key={idx} onClick={() => handleOptionClick(opt)} disabled={showResult && !isExamMode} className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-semibold text-lg ${btnClass}`}>
                <span className="mr-4 text-slate-500 font-black">{['A','B','C','D'][idx]}.</span> {opt}
              </button>
            );
          })}
        </div>
        
        {isExamMode && selectedAnswer && (
          <button onClick={handleNext} className="w-full py-4 mt-8 bg-brand-500 text-slate-950 font-black text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-brand-400 transition shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95">
            {currentIndex === gameData.length - 1 ? "Submit Assessment" : "Next Question"} <ArrowRight size={20} />
          </button>
        )}

        {!isExamMode && showResult && (
          <div className="mt-8 p-6 bg-slate-900 border border-slate-700 rounded-2xl animate-in slide-in-from-bottom-4 shadow-xl">
            <h4 className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-3">Explanation</h4>
            <p className="text-base text-slate-300 leading-relaxed mb-6">{currentItem.explanation || "No detailed explanation recorded."}</p>
            <button onClick={handleNext} className="w-full py-4 bg-brand-500 text-slate-950 font-black text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-brand-400 transition shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95">
              Next Question <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------
  // 4. SPOT THE TRAP MODE UI
  // ---------------------------------------------------------
  if (gameType === 'trap') {
    const handleTrapClick = (guessedTrue) => {
      if (showResult) return;
      setSelectedAnswer(guessedTrue);
      setShowResult(true);

      if (guessedTrue === currentItem.is_true) {
        setScore(prev => prev + 1);
        setSessionLog(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
      } else {
        setSessionLog(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
        setMistakes(prev => [...prev, { 
          type: 'trap', statement: currentItem.statement, 
          correct_answer: currentItem.is_true ? "FACT (True)" : "TRAP (False)", 
          student_answer: guessedTrue ? "FACT (True)" : "TRAP (False)", 
          explanation: currentItem.catch, streak: 0
        }]);
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-bold text-slate-500 bg-slate-900 px-5 py-4 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-6">
            <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white">Statement {currentIndex + 1} / {gameData.length}</span>
            <span className="text-brand-400 uppercase tracking-widest">Score: {score}</span>
          </div>
          <TacticalTimer timeLimitMinutes={curriculumData?.timeLimitMinutes || 5} onTimeUp={handleTimeUp} />
        </div>

        <div className="bg-slate-800 p-10 rounded-3xl border-2 border-slate-700 text-center shadow-xl">
          <h3 className="text-2xl font-black text-white leading-relaxed">"{currentItem.statement}"</h3>
        </div>
        {!showResult ? (
          <div className="grid grid-cols-2 gap-6">
            <button onClick={() => handleTrapClick(true)} className="p-6 bg-emerald-950/40 border-2 border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg active:scale-95"><CheckCircle2 size={32} /> FACT (True)</button>
            <button onClick={() => handleTrapClick(false)} className="p-6 bg-rose-950/40 border-2 border-rose-500/50 hover:bg-rose-600 hover:text-white text-rose-400 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg active:scale-95"><ShieldAlert size={32} /> TRAP (False)</button>
          </div>
        ) : (
          <div className="mt-8 p-8 bg-slate-900 border border-slate-700 rounded-3xl animate-in slide-in-from-bottom-4 text-center shadow-xl">
            {selectedAnswer === currentItem.is_true ? <div className="text-emerald-400 font-black text-2xl mb-3 flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Correct Analysis!</div> : <div className="text-rose-400 font-black text-2xl mb-3 flex items-center justify-center gap-2"><XCircle size={28}/> You fell for the trap!</div>}
            <p className="text-slate-300 text-lg mb-8 bg-slate-950 p-6 rounded-2xl inline-block text-left w-full leading-relaxed border border-slate-800 shadow-inner"><span className="font-bold text-amber-400 text-sm uppercase block mb-2 tracking-widest">The Catch:</span> {currentItem.catch}</p>
            <button onClick={handleNext} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-xl flex items-center justify-center gap-3 transition shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95">Next Statement <ArrowRight size={20} /></button>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------
  // 5. FLASHCARDS MODE UI
  // ---------------------------------------------------------
  if (gameType === 'flashcards') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300 flex flex-col items-center">
        <div className="text-sm font-bold text-slate-500 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800 w-full text-center shadow-inner uppercase tracking-widest">Card <span className="text-sky-400 mx-1">{currentIndex + 1}</span> of {gameData.length}</div>
        <div onClick={() => setIsFlipped(!isFlipped)} className="w-full aspect-[4/3] bg-slate-900 border border-slate-700 rounded-3xl cursor-pointer hover:border-sky-500 transition-all duration-500 flex flex-col items-center justify-center p-10 text-center shadow-2xl group relative overflow-hidden">
          <div className="absolute top-6 right-6 text-slate-600 group-hover:text-sky-400 transition"><RotateCw size={24} /></div>
          {!isFlipped ? (
            <div className="animate-in fade-in duration-300"><span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-5 block bg-sky-500/10 px-3 py-1 rounded-full w-fit mx-auto border border-sky-500/20">Term / Concept</span><h3 className="text-3xl md:text-4xl font-black text-white leading-snug">{currentItem.front}</h3></div>
          ) : (
            <div className="animate-in fade-in duration-300"><span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-5 block bg-emerald-500/10 px-3 py-1 rounded-full w-fit mx-auto border border-emerald-500/20">Definition</span><p className="text-xl font-semibold text-slate-200 leading-relaxed">{currentItem.back}</p></div>
          )}
        </div>
        <button onClick={handleNext} className="px-10 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-lg rounded-2xl flex items-center gap-3 transition w-full justify-center shadow-[0_0_20px_rgba(2,132,199,0.3)] active:scale-95">Next Card <ArrowRight size={20} /></button>
      </div>
    );
  }
  
  return null;
}