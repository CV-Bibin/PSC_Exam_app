import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Layers, ShieldAlert, CheckCircle2, XCircle, ArrowRight, RotateCw, Trophy, Eye, RefreshCw, ArrowLeft, AlertOctagon, BookmarkPlus } from 'lucide-react';
import TacticalTimer from './TacticalTimer';
import CBTExamLayout from './CBTExamLayout';
import { auth, db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';


export default function GameEngine({ gameType, curriculumData, onExit, onMarkComplete, isExamMode = false, forceReviewMode = false, examId = 'default', dayNumber }) {
  const navigate = useNavigate();
  const { globalScores, completedExams, mistakes: cloudMistakes, updateCloudProgress, profile, completedDays } = useAuth();

  const [isReviewMode, setIsReviewMode] = useState(forceReviewMode);
  const [isExamSubmitted, setIsExamSubmitted] = useState(forceReviewMode);

  const [userAnswers, setUserAnswers] = useState(() => {
    if (forceReviewMode) {
      // Find the specific exam history in global scores
      const hist = (globalScores || []).find(e => e.examId === examId);
      return hist?.answers || {};
    }
    return {};
  });

  const [score, setScore] = useState(() => {
    if (forceReviewMode) {
      const hist = (globalScores || []).find(e => e.examId === examId);
      return hist?.score || 0;
    }
    return 0;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [sessionLog, setSessionLog] = useState({ correct: [], incorrect: [], skipped: 0, penalty: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedQuestions, setViewedQuestions] = useState([0]);

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

  // 🚀 RESTRICT ATTEMPTS FOR HIGH-STAKES EXAMS
  let maxAllowed = curriculumData?.maxAttempts === 'unlimited' ? Infinity : parseInt(curriculumData?.maxAttempts || 1);
  const isHighStakes = curriculumData?.isGrandMock || examId.includes('monthly') || examId.includes('grand') || examId.includes('weekly');

  if (isHighStakes && !examId.includes('live')) {
    maxAllowed = 1; // Strictly limits Mocks to a single attempt
  }

  // 🚀 Read attempts dynamically from Firebase history
  const currentAttempts = (globalScores || []).filter(e => e.examId === examId).length;
  const remainingAfterSubmit = maxAllowed - currentAttempts;

  const isNegativeMarkingApplicable = curriculumData?.isGrandMock || examId.includes('monthly') || examId.includes('live') || examId.includes('grand');
  const PENALTY_SCORE = 0.33;

  useEffect(() => {
    // 🚀 PREVENT RESULT SCREEN SKIP: If the user just submitted the exam, 
    // block Firebase from forcing the app straight into Review Mode.
    if (isExamSubmitted) return;

    if (forceReviewMode) {
      // 🚀 Pull from cloud history instead of local storage
      const hist = (globalScores || []).find(e => e.examId === examId);
      setIsReviewMode(true);
      setIsExamSubmitted(true);
      setScore(hist?.score || 0);
      setUserAnswers(hist?.answers || {});
      setViewedQuestions(gameData.map((_, i) => i));
    } else {
      setIsReviewMode(false);
      setIsExamSubmitted(false);
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers({});
      setMistakes([]);
      setShowResult(false);
      setSelectedAnswer(null);
      setViewedQuestions([0]);
    }
  }, [forceReviewMode, examId, gameData.length]);

  // 🚀 HELPER: Checks if the question is already in the Vault
  const isQuestionSaved = (q) => {
    const savedQs = profile?.favQuestions || [];
    return savedQs.some(item => item.question === (q.question || q.statement));
  };

 const handleSaveQuestion = (q) => {
    const savedQs = profile?.favQuestions || [];

    if (!isQuestionSaved(q)) {
      const newSaved = { id: Date.now().toString(), ...q };
      // 🚀 Writes to Firebase
      updateCloudProgress({ favQuestions: [newSaved, ...savedQs] });
      toast.success("Question saved to your Vault!"); // 🚀 Replaced alert with toast
    } else {
      toast.error("Already saved in Vault!"); // 🚀 Replaced alert with toast
    }
  };

  const handleFinalSubmit = async () => {
    let rawScore = 0;
    let wrongCount = 0;
    let skipCount = 0;
    let newMistakes = [];
    let log = { correct: [], incorrect: [], skipped: 0, penalty: 0 };

    gameData.forEach((q, idx) => {
      const studentAns = userAnswers[idx];
      const targetAns = q.correct_answer || q.correct;

      if (!studentAns || studentAns === "Skipped") {
        skipCount++;
      } else if (studentAns === targetAns) {
        rawScore += 1;
        log.correct.push(q);
      } else {
        wrongCount += 1;
        log.incorrect.push(q);
        newMistakes.push({
          type: gameType,
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

    let finalExamScore = rawScore;
    let penaltyIncurred = 0;

    if (isExamMode && isNegativeMarkingApplicable) {
      penaltyIncurred = wrongCount * PENALTY_SCORE;
      finalExamScore = rawScore - penaltyIncurred;
      finalExamScore = Number(finalExamScore.toFixed(2));
    }

    log.skipped = skipCount;
    log.penalty = penaltyIncurred;

    setScore(finalExamScore);
    setMistakes(newMistakes);
    setSessionLog(log);
    setIsExamSubmitted(true);

    // 🚀 FIREBASE CLOUD SYNC: Batch all progress into one secure update
    const cloudUpdatePayload = {};

    // 1. Merge new mistakes securely
    if (newMistakes.length > 0) {
      const existingMistakes = cloudMistakes || [];
      const uniqueNew = newMistakes.filter(m => !existingMistakes.some(em => em.question === m.question));
      if (uniqueNew.length > 0) {
        cloudUpdatePayload.mistakes = [...existingMistakes, ...uniqueNew];
      }
    }

    // 2. Only save the score/history if it's their first attempt (or if it's unlimited)
    if (currentAttempts === 0 || maxAllowed === Infinity) {
      const newScoreRecord = {
        examId,
        score: finalExamScore,
        total: gameData.length,
        answers: userAnswers,
        log: log,
        date: new Date().toISOString()
      };

      cloudUpdatePayload.globalScores = [...(globalScores || []), newScoreRecord];

      const existingCompletedExams = completedExams || [];
      if (!existingCompletedExams.includes(examId)) {
        cloudUpdatePayload.completedExams = [...existingCompletedExams, examId];
      }
    }

    // Fire the single batch update to the cloud
    if (Object.keys(cloudUpdatePayload).length > 0) {
      updateCloudProgress(cloudUpdatePayload);
    }

    if (auth.currentUser) {
      try {
        await addDoc(collection(db, 'exam_results'), {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          examId: examId || 'unknown_exam',
          examType: gameType || 'mcq',
          score: finalExamScore,
          totalQuestions: gameData.length,
          submittedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to sync score to database:", error);
      }
    }

    if (onMarkComplete) onMarkComplete(gameType, log);
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setSelectedAnswer(userAnswers[index] || null);
    setViewedQuestions(prev => Array.from(new Set([...prev, index])));
  };

  const handleNext = () => {
    if (isExamMode) {
      if (currentIndex === gameData.length - 1) handleFinalSubmit();
      else goToQuestion(currentIndex + 1);
    } else {
      setShowResult(false);
      setSelectedAnswer(null);
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) goToQuestion(currentIndex - 1);
  };

  const handleClearResponse = () => {
    setSelectedAnswer(null);
    setUserAnswers(prev => {
      const updated = { ...prev };
      delete updated[currentIndex];
      return updated;
    });
  };

  const handleTimeUp = () => {
    if (isExamMode) handleFinalSubmit();
    else { setShowResult(true); setCurrentIndex(gameData.length); }
  };

  const handleExitClick = () => {
    if (!isExamMode && onMarkComplete) onMarkComplete(gameType, sessionLog);

    // 🚀 Sync daily slide completion to Firebase
    if (dayNumber) {
      const currentCompleted = completedDays || [];
      if (!currentCompleted.includes(Number(dayNumber))) {
        updateCloudProgress({
          completedDays: [...currentCompleted, Number(dayNumber)]
        });
      }
    }

    if (onExit) onExit();
    else navigate('/arena');
  };

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
            const isSkipped = !userAnswers[idx];

            return (
              <div key={idx} className="p-6 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {isSkipped ? <AlertOctagon className="text-slate-500" size={24} /> : isCorrect ? <CheckCircle2 className="text-emerald-500" size={24} /> : <XCircle className="text-rose-500" size={24} />}
                  </div>
                  <div className="w-full">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">
                      Question {idx + 1} {isSkipped && "(Skipped)"}
                    </span>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h4 className="text-lg font-bold text-white">{q.question || q.statement}</h4>
                      {(() => {
                        const isSaved = isQuestionSaved(q);
                        return (
                          <button
                            onClick={() => handleSaveQuestion(q)}
                            disabled={isSaved}
                            className={`p-2 rounded-lg transition shrink-0 border ${isSaved
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-default'
                                : 'bg-slate-950 text-slate-400 hover:text-amber-400 border-slate-800 hover:border-amber-500/50'
                              }`}
                            title={isSaved ? "Saved to Vault" : "Save Question to Vault"}
                          >
                            {isSaved ? <CheckCircle2 size={16} /> : <BookmarkPlus size={16} />}
                          </button>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className={`p-4 rounded-xl border ${isSkipped ? 'bg-slate-950 border-slate-800' : isCorrect ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-rose-950/20 border-rose-900/50'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isSkipped ? 'text-slate-500' : isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>Your Answer</span>
                        <p className={isSkipped ? 'text-slate-500 font-semibold' : isCorrect ? 'text-emerald-100 font-semibold' : 'text-rose-100 font-semibold'}>{studentAns}</p>
                      </div>

                      {!isCorrect && (
                        <div className="p-4 rounded-xl bg-slate-950 border border-brand-500/30 shadow-inner">
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
      <div className="flex flex-col items-center justify-center p-6 md:p-10 text-center animate-in zoom-in-95 duration-500 w-full h-full">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Trophy size={40} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Assessment Concluded!</h2>

        {gameType !== 'flashcards' && gameData.length > 0 && (
          <div className="mb-8 mt-4 w-full max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Final Score</span>
              <span className="font-black text-5xl md:text-6xl text-brand-400 block mt-2">{score} <span className="text-2xl text-slate-500">/ {gameData.length}</span></span>

              {/* 🚀 UPGRADED: Highly Detailed Negative Marking Breakdown Grid */}
              {isExamMode && isNegativeMarkingApplicable && (
                <div className="mt-8 pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Attempted</span>
                    <span className="block text-2xl font-black text-white">{sessionLog.correct.length + sessionLog.incorrect.length}</span>
                  </div>
                  <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/50 shadow-inner">
                    <span className="block text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Correct</span>
                    <span className="block text-2xl font-black text-emerald-400">{sessionLog.correct.length}</span>
                  </div>
                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/50 shadow-inner">
                    <span className="block text-[10px] text-rose-500 font-bold uppercase tracking-widest mb-1">Wrong</span>
                    <span className="block text-2xl font-black text-rose-400">{sessionLog.incorrect.length}</span>
                    <span className="block text-[9px] text-rose-500/70 font-bold uppercase mt-1">(-{sessionLog.penalty.toFixed(2)})</span>
                  </div>
                  <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/50 shadow-inner">
                    <span className="block text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Skipped</span>
                    <span className="block text-2xl font-black text-amber-400">{sessionLog.skipped}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center mt-2">
          {isExamMode && gameData.length > 0 && (
            <button onClick={() => setIsReviewMode(true)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-black rounded-xl transition border border-sky-500/30 flex items-center gap-2">
              <Eye size={20} /> Review Answers
            </button>
          )}

          {/* Re-attempt only shows if remainingAfterSubmit > 0 (High stakes are hardcapped to 1, so this automatically hides for them) */}
          {isExamMode && remainingAfterSubmit > 0 && gameData.length > 0 && (
            <button onClick={() => window.location.href = window.location.pathname} className="px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2">
              <RefreshCw size={20} /> Re-Attempt
            </button>
          )}

          <button onClick={handleExitClick} className="px-8 py-4 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center gap-2">
            Return to Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const currentItem = gameData[currentIndex];

  if (gameType === 'mcq') {
    const handleOptionClick = (option) => {
      if (isExamMode) {
        // 🚀 Click again to unselect without needing a dedicated clear button
        if (selectedAnswer === option) {
          handleClearResponse();
        } else {
          setSelectedAnswer(option);
          setUserAnswers(prev => ({ ...prev, [currentIndex]: option }));
        }
      } else {
        if (showResult) return;
        setSelectedAnswer(option);
        setShowResult(true);

        const targetAnswer = currentItem.correct_answer || currentItem.correct;
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

    if (isExamMode) {
      return (
        <CBTExamLayout
          gameData={gameData}
          currentIndex={currentIndex}
          goToQuestion={goToQuestion}
          userAnswers={userAnswers}
          handleOptionClick={handleOptionClick}
          handleNext={handleNext}
          handlePrev={handlePrev}
          handleFinalSubmit={handleFinalSubmit}
          handleSaveQuestion={handleSaveQuestion}
          curriculumData={curriculumData}
          handleTimeUp={handleTimeUp}
          viewedQuestions={viewedQuestions}
        />
      );
    }

    const targetAnswer = currentItem.correct_answer || currentItem.correct;
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-bold text-slate-500 bg-slate-900 px-5 py-4 rounded-2xl border border-slate-800 shadow-inner">
          <div className="flex items-center gap-4">
            <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white">Q {currentIndex + 1} / {gameData.length}</span>
            <span className="text-brand-400 uppercase tracking-widest">Score: {score}</span>
            {(() => {
              const isSaved = isQuestionSaved(currentItem);
              return (
                <button
                  onClick={() => handleSaveQuestion(currentItem)}
                  disabled={isSaved}
                  className={`p-1.5 rounded-lg border transition ${isSaved
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-default'
                      : 'text-slate-400 hover:text-amber-400 bg-slate-950 border-slate-800 hover:border-amber-500/50'
                    }`}
                  title={isSaved ? "Saved to Vault" : "Save Question to Vault"}
                >
                  {isSaved ? <CheckCircle2 size={16} /> : <BookmarkPlus size={16} />}
                </button>
              );
            })()}
          </div>
          <TacticalTimer timeLimitMinutes={curriculumData?.timeLimitMinutes || 10} onTimeUp={handleTimeUp} />
        </div>

        <h3 className="text-2xl font-black text-white leading-relaxed">{currentItem.question}</h3>

        <div className="space-y-4">
          {currentItem.options?.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === targetAnswer;
            let btnClass = "bg-slate-900 border-slate-700 hover:border-brand-500 hover:bg-slate-800 text-slate-200";

            if (showResult) {
              if (isCorrect) btnClass = "bg-emerald-950/50 border-emerald-500 text-emerald-100";
              else if (isSelected) btnClass = "bg-rose-950/50 border-rose-500 text-rose-100";
              else btnClass = "bg-slate-950 border-slate-800 text-slate-600 opacity-50";
            }

            return (
              <button key={idx} onClick={() => handleOptionClick(opt)} disabled={showResult} className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-semibold text-lg ${btnClass}`}>
                <span className="mr-4 text-slate-500 font-black">{['A', 'B', 'C', 'D'][idx]}.</span> {opt}
              </button>
            );
          })}
        </div>

        {showResult && (
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
              className={`p-6 rounded-2xl border-2 font-black text-xl transition ${showResult
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
              className={`p-6 rounded-2xl border-2 font-black text-xl transition ${showResult
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
              {selectedAnswer === currentItem.is_true ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />}
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
      setTimeout(() => handleNext(), 150);
    };

    return (
      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300 flex flex-col items-center">
        <div className="text-sm font-bold text-slate-500 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800 w-full text-center shadow-inner uppercase tracking-widest">
          Card <span className="text-sky-400 mx-1">{currentIndex + 1}</span> of {gameData.length}
        </div>

        <div className="relative w-full aspect-[4/3] [perspective:1000px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`w-full h-full relative transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

            <div className="absolute inset-0 [backface-visibility:hidden] bg-slate-900 border-2 border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl group-hover:border-sky-500/50 transition">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-5 block bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">Term / Concept</span>
              <h3 className="text-3xl md:text-4xl font-black text-white leading-snug">{currentItem.front}</h3>
              <p className="text-slate-500 text-sm mt-8 uppercase tracking-widest font-bold flex items-center gap-2"><RotateCw size={14} /> Click to flip</p>
            </div>

            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-slate-950 border-2 border-emerald-500/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-5 block bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Definition</span>
              <p className="text-xl font-semibold text-slate-200 leading-relaxed">{currentItem.back}</p>
              {currentItem.hint && <p className="text-slate-400 text-sm italic border-t border-emerald-500/20 pt-4 mt-4 max-w-sm">{currentItem.hint}</p>}
            </div>

          </div>
        </div>

        {isFlipped && (
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 fade-in w-full">
            <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult(false); }} className="p-4 bg-slate-900 border border-slate-700 hover:border-rose-500 hover:bg-rose-950/30 text-rose-400 font-bold rounded-xl transition flex items-center justify-center gap-2">
              <XCircle size={18} /> Needs Practice
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult(true); }} className="p-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2">
              Got It <CheckCircle2 size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}