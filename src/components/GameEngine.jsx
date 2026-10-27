import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 🚀 FIX 1: Imported navigation
import { Target, Layers, ShieldAlert, CheckCircle2, XCircle, ArrowRight, RotateCw, Trophy, Eye, RefreshCw, ArrowLeft, AlertOctagon,BookmarkPlus } from 'lucide-react';
import TacticalTimer from './TacticalTimer';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 🚀 Added examId and forceReviewMode to handle live exams properly
export default function GameEngine({ gameType, curriculumData, onExit, onMarkComplete, isExamMode = false, forceReviewMode = false, examId = 'default' }) {
  const navigate = useNavigate(); // 🚀 Initialize navigation

  // Synchronous initialization for exam history
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

  // 🚀 FIX 2: Added curriculumData?.questions fallback so Live Exams load properly!
  let extractedMCQData = [];
  if (Array.isArray(curriculumData)) {
    extractedMCQData = curriculumData;
  } else if (curriculumData?.questions) {
    extractedMCQData = curriculumData.questions;
  } else if (curriculumData?.quizzes) {
    extractedMCQData = curriculumData.quizzes;
  }

  const gameData = 
    gameType === 'mcq' ? extractedMCQData :
    gameType === 'flashcards' ? (curriculumData?.games?.flashcards || []) :
    gameType === 'trap' ? (curriculumData?.games?.spot_the_trap || []) : [];

  const isFinished = isExamMode ? isExamSubmitted : (currentIndex >= gameData.length);

  const maxAllowed = curriculumData?.maxAttempts === 'unlimited' ? Infinity : (curriculumData?.maxAttempts || 1);
// Read attempts from local storage based on this specific exam ID
const currentAttempts = parseInt(localStorage.getItem(`psc_attempts_${examId}`) || '0');
const remainingAfterSubmit = maxAllowed - currentAttempts;

  // Sync State on Navigation to prevent overlap
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



const handleSaveQuestion = (q) => {
    const savedQs = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]');
    if (!savedQs.find(item => item.question === q.question)) {
      const newSaved = { id: Date.now().toString(), ...q };
      localStorage.setItem('psc_fav_questions', JSON.stringify([newSaved, ...savedQs]));
      alert("Question saved to your Vault!");
    } else {
      alert("Already saved in Vault!");
    }
  };

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
          type: 'mcq', 
          question: q.question || q.statement, 
          options: q.options || [],
          correct_answer: targetAns, 
          student_answer: studentAns,
          explanation: q.explanation || "No explanation provided.", 
          streak: 0,
          dateAdded: new Date().toISOString()
        });
      }
    });

    setScore(finalScore); 
    setMistakes(newMistakes); 
    setSessionLog(log); 
    setIsExamSubmitted(true);

    // 1. Save History for Review Mode
    localStorage.setItem(`psc_exam_history_${examId}`, JSON.stringify({
      score: finalScore, answers: userAnswers, log: log
    }));

    // 2. Increment Attempts
    localStorage.setItem(`psc_attempts_${examId}`, currentAttempts + 1);

    // 3. AUTO-SAVE MISTAKES!
    if (newMistakes.length > 0) {
      const existingMistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
      // Filter out mistakes that are already saved
      const uniqueNew = newMistakes.filter(m => !existingMistakes.some(em => em.question === m.question));
      if (uniqueNew.length > 0) {
        localStorage.setItem('psc_mistakes', JSON.stringify([...existingMistakes, ...uniqueNew]));
      }
    }
    
    if (onMarkComplete) onMarkComplete(gameType, log);
  };

  const handleNext = () => {
    if (isExamMode) {
      if (currentIndex === gameData.length - 1) handleFinalSubmit();
      else { 
        setSelectedAnswer(userAnswers[currentIndex + 1] || null); 
        setCurrentIndex(prev => prev + 1); 
      }
    } else {
      setShowResult(false); 
      setSelectedAnswer(null); 
      setIsFlipped(false); 
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTimeUp = () => {
    if (isExamMode) handleFinalSubmit();
    else { setShowResult(true); setCurrentIndex(gameData.length); }
  };

  // 🚀 FIX 3: Bulletproof Exit Handler
 const handleExitClick = () => {
    // 🚀 CRITICAL FIX: Sends the streak data to MistakeLog right before closing!
    if (!isExamMode && onMarkComplete) {
      onMarkComplete(gameType, sessionLog);
    }
    
    if (onExit) onExit();
    else navigate('/arena'); 
  };

  // --- TACTICAL REVIEW UI ---
  if (isReviewMode) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-8 pb-10">
        <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 sticky top-0 z-20 shadow-2xl">
          <div>
            <h3 className="font-black text-white text-xl">Tactical Answer Key</h3>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Final Score: {score} / {gameData.length}</p>
          </div>
          <button onClick={() => forceReviewMode ? handleExitClick() : setIsReviewMode(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
            <ArrowLeft size={16} /> {forceReviewMode ? "Return to Arena" : "Back to Dashboard"}
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
                    <div className="flex items-start justify-between gap-4 mb-4">
  <h4 className="text-lg font-bold text-white">{q.question || q.statement}</h4>
  
  <button 
    onClick={() => {
      const savedQs = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]');
      if (!savedQs.find(item => item.question === (q.question || q.statement))) {
        localStorage.setItem('psc_fav_questions', JSON.stringify([{ id: Date.now().toString(), ...q }, ...savedQs]));
        alert("Question saved to your Vault!");
      } else {
        alert("Already saved in Vault!");
      }
    }}
    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition shrink-0"
    title="Save Question to Vault"
  >
    <BookmarkPlus size={16} />
  </button>
</div>
                    
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

  // --- FINAL SCORE SCREEN ---
  if (isFinished || gameData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95 duration-500 w-full h-full">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Assessment Concluded!</h2>
        
        {gameType !== 'flashcards' && gameData.length > 0 && (
          <p className="text-slate-300 text-lg mb-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl mt-4">
            You scored <span className="font-black text-4xl text-brand-400 block mt-2">{score} <span className="text-xl text-slate-500">/ {gameData.length}</span></span>
          </p>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-2">
          {isExamMode && gameData.length > 0 && (
            <button onClick={() => setIsReviewMode(true)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-black rounded-xl transition border border-sky-500/30 flex items-center gap-2">
              <Eye size={20} /> Review Answers
            </button>
          )}
          
          {isExamMode && remainingAfterSubmit > 0 && gameData.length > 0 && (
            <button onClick={() => window.location.href = window.location.pathname} className="px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2">
              <RefreshCw size={20} /> Re-Attempt ({remainingAfterSubmit === Infinity ? '∞' : remainingAfterSubmit} Left)
            </button>
          )}

          {/* 🚀 FIX 4: Updated button to use handleExitClick */}
          <button onClick={handleExitClick} className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center gap-2">
            Return to Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const currentItem = gameData[currentIndex];

  // --- MULTIPLE CHOICE LOGIC ---
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
          <div className="flex items-center gap-4">
  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white">Q {currentIndex + 1} / {gameData.length}</span>
  {!isExamMode && <span className="text-brand-400 uppercase tracking-widest">Score: {score}</span>}
  
  {/* The New Bookmark Button */}
  <button 
    onClick={() => handleSaveQuestion(currentItem)}
    className="p-1.5 text-slate-400 hover:text-amber-400 bg-slate-950 border border-slate-800 rounded-lg transition"
    title="Save Question to Vault"
  >
    <BookmarkPlus size={16} />
  </button>
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

  // --- SPOT THE TRAP LOGIC ---
  if (gameType === 'trap') {
    const handleTrapClick = (guess) => {
      if (showResult) return;
      const isCorrect = guess === currentItem.is_true;
      setSelectedAnswer(guess);
      setShowResult(true);

      if (isCorrect) {
        setScore(prev => prev + 1);
        setSessionLog(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
      } else {
        setSessionLog(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
        setMistakes(prev => [...prev, {
          type: 'trap', statement: currentItem.statement,
          is_true: currentItem.is_true, catch: currentItem.catch, streak: 0
        }]);
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex justify-between items-center bg-slate-900 px-5 py-4 rounded-2xl border border-slate-800 shadow-inner">
          <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white font-bold text-sm">Trap {currentIndex + 1} / {gameData.length}</span>
          <span className="text-brand-400 font-bold uppercase tracking-widest text-sm">Score: {score}</span>
        </div>

        <div className="bg-slate-800 p-10 rounded-3xl border-2 border-slate-700 text-center shadow-xl">
          <h3 className="text-2xl md:text-3xl font-black text-white leading-relaxed mb-10">"{currentItem.statement}"</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => handleTrapClick(true)} 
              disabled={showResult}
              className={`p-6 rounded-2xl border-2 font-black text-xl transition ${
                showResult 
                  ? currentItem.is_true 
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400' 
                    : selectedAnswer === true ? 'bg-rose-950/50 border-rose-500 text-rose-400 opacity-50' : 'bg-slate-950 border-slate-800 text-slate-600'
                  : 'bg-slate-900 border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-400'
              }`}
            >
              FACT (True)
            </button>
            <button 
              onClick={() => handleTrapClick(false)} 
              disabled={showResult}
              className={`p-6 rounded-2xl border-2 font-black text-xl transition ${
                showResult 
                  ? !currentItem.is_true 
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400' 
                    : selectedAnswer === false ? 'bg-rose-950/50 border-rose-500 text-rose-400 opacity-50' : 'bg-slate-950 border-slate-800 text-slate-600'
                  : 'bg-slate-900 border-slate-700 hover:border-rose-500 text-slate-200 hover:text-rose-400'
              }`}
            >
              TRAP (False)
            </button>
          </div>
        </div>

        {showResult && (
          <div className={`p-6 rounded-2xl animate-in slide-in-from-bottom-4 border ${selectedAnswer === currentItem.is_true ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'}`}>
            <h4 className={`text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${selectedAnswer === currentItem.is_true ? 'text-emerald-400' : 'text-rose-400'}`}>
              {selectedAnswer === currentItem.is_true ? <CheckCircle2 size={18}/> : <AlertOctagon size={18}/>}
              {selectedAnswer === currentItem.is_true ? 'Spot On!' : 'You fell for the trap!'}
            </h4>
            <p className="text-slate-300 text-lg leading-relaxed"><strong className="text-amber-400">The Catch:</strong> {currentItem.catch}</p>
            <button onClick={handleNext} className="w-full mt-6 py-4 bg-slate-800 text-white font-black text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-slate-700 transition">
              Next Trap <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- FLASHCARDS LOGIC ---
  if (gameType === 'flashcards') {
    const handleFlashcardResult = (success) => {
      if (success) {
        setScore(prev => prev + 1);
        setSessionLog(prev => ({ ...prev, correct: [...prev.correct, currentItem] }));
      } else {
        setSessionLog(prev => ({ ...prev, incorrect: [...prev.incorrect, currentItem] }));
      }
      setIsFlipped(false);
      handleNext();
    };

    return (
      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-300">
        <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-4 px-2">
          <span>Card {currentIndex + 1} of {gameData.length}</span>
          <span className="text-brand-400 uppercase tracking-widest">Mastered: {score}</span>
        </div>

        <div className="relative w-full aspect-[4/3] perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            <div className="absolute inset-0 backface-hidden bg-civil-card border-2 border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl group-hover:border-brand-500/50 transition">
              <Layers size={32} className="text-brand-400 mb-6 opacity-50" />
              <h3 className="text-2xl md:text-3xl font-black text-white">{currentItem.front}</h3>
              <p className="text-slate-500 text-sm mt-8 uppercase tracking-widest font-bold flex items-center gap-2"><RotateCw size={14}/> Click to flip</p>
            </div>

            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-brand-950/20 border-2 border-brand-500/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <h3 className="text-xl md:text-2xl font-bold text-brand-100 mb-6 leading-relaxed">{currentItem.back}</h3>
              {currentItem.hint && <p className="text-slate-400 text-sm italic border-t border-brand-500/20 pt-4 mt-2 max-w-sm">{currentItem.hint}</p>}
            </div>
            
          </div>
        </div>

        {isFlipped && (
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 fade-in">
            <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult(false); }} className="p-4 bg-slate-900 border border-slate-700 hover:border-rose-500 hover:bg-rose-950/30 text-rose-400 font-bold rounded-xl transition flex items-center justify-center gap-2">
              <XCircle size={18} /> Needs Practice
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult(true); }} className="p-4 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2">
              Got It <CheckCircle2 size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}