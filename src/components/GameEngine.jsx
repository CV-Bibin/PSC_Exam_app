import { useState, useEffect } from 'react';
import { Target, Layers, ShieldAlert, CheckCircle2, XCircle, ArrowRight, RotateCw, Trophy } from 'lucide-react';

export default function GameEngine({ gameType, curriculumData, onExit, onMarkComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false); 
  const [mistakes, setMistakes] = useState([]); // Tracks wrong answers to test tomorrow!

  const gameData = 
    gameType === 'mcq' ? curriculumData?.quizzes || [] :
    gameType === 'flashcards' ? curriculumData?.games?.flashcards || [] :
    gameType === 'trap' ? curriculumData?.games?.spot_the_trap || [] : [];

  const isFinished = currentIndex >= gameData.length;

  // On Complete: Mark as Done and Save Mistakes to Memory
  useEffect(() => {
    if (isFinished && gameData.length > 0) {
      onMarkComplete(gameType);
      if (mistakes.length > 0) {
        const existingMistakes = JSON.parse(localStorage.getItem('psc_mistakes') || '[]');
        localStorage.setItem('psc_mistakes', JSON.stringify([...existingMistakes, ...mistakes]));
      }
    }
  }, [isFinished]);

  const handleNext = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    setIsFlipped(false);
    setCurrentIndex(prev => prev + 1);
  };

  if (isFinished || gameData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95 duration-500 w-full h-full">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Drill Complete!</h2>
        {gameType !== 'flashcards' && (
          <p className="text-slate-300 text-lg mb-8">
            You scored <span className="font-bold text-brand-400">{score}</span> out of {gameData.length}
          </p>
        )}
        <button onClick={onExit} className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold rounded-xl transition shadow-lg">
          Return to Vault
        </button>
      </div>
    );
  }

  const currentItem = gameData[currentIndex];

  if (gameType === 'mcq') {
    const handleOptionClick = (option) => {
      if (showResult) return;
      setSelectedAnswer(option);
      setShowResult(true);
      if (option === currentItem.correct_answer) {
        setScore(prev => prev + 1);
      } else {
        // Log the mistake for future spaced repetition
        setMistakes(prev => [...prev, { type: 'mcq', question: currentItem.question, correct: currentItem.correct_answer }]);
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex justify-between items-center text-sm font-bold text-slate-500 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
          <span>Question {currentIndex + 1} of {gameData.length}</span>
          <span>Score: {score}</span>
        </div>
        <h3 className="text-2xl font-black text-white leading-relaxed">{currentItem.question}</h3>
        <div className="space-y-4">
          {currentItem.options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrect = opt === currentItem.correct_answer;
            let btnClass = "bg-slate-900 border-slate-700 hover:border-brand-500 hover:bg-slate-800 text-slate-200";
            if (showResult) {
              if (isCorrect) btnClass = "bg-emerald-950/50 border-emerald-500 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
              else if (isSelected) btnClass = "bg-rose-950/50 border-rose-500 text-rose-100";
              else btnClass = "bg-slate-950 border-slate-800 text-slate-600 opacity-50";
            }
            return (
              <button key={idx} onClick={() => handleOptionClick(opt)} disabled={showResult} className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-semibold text-lg ${btnClass}`}>
                <span className="mr-4 text-slate-500">{['A','B','C','D'][idx]}.</span> {opt}
              </button>
            );
          })}
        </div>
        {showResult && (
          <div className="mt-8 p-6 bg-slate-900 border border-slate-700 rounded-2xl animate-in slide-in-from-bottom-4 shadow-xl">
            <h4 className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-3">Explanation</h4>
            <p className="text-base text-slate-300 leading-relaxed mb-6">{currentItem.explanation}</p>
            <button onClick={handleNext} className="w-full py-4 bg-brand-500 text-slate-950 font-bold text-lg rounded-xl flex items-center justify-center gap-3 hover:bg-brand-600 transition shadow-lg">
              Next Question <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (gameType === 'trap') {
    const handleTrapClick = (guessedTrue) => {
      if (showResult) return;
      setSelectedAnswer(guessedTrue);
      setShowResult(true);
      if (guessedTrue === currentItem.is_true) {
        setScore(prev => prev + 1);
      } else {
        setMistakes(prev => [...prev, { type: 'trap', statement: currentItem.statement, fact: currentItem.catch }]);
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
        <div className="flex justify-between items-center text-sm font-bold text-slate-500 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
          <span>Statement {currentIndex + 1} of {gameData.length}</span>
          <span>Score: {score}</span>
        </div>
        <div className="bg-slate-800 p-10 rounded-3xl border-2 border-slate-700 text-center shadow-xl">
          <h3 className="text-2xl font-black text-white leading-relaxed">"{currentItem.statement}"</h3>
        </div>
        {!showResult ? (
          <div className="grid grid-cols-2 gap-6">
            <button onClick={() => handleTrapClick(true)} className="p-6 bg-emerald-950/40 border-2 border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-400 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg">
              <CheckCircle2 size={32} /> FACT (True)
            </button>
            <button onClick={() => handleTrapClick(false)} className="p-6 bg-rose-950/40 border-2 border-rose-500/50 hover:bg-rose-600 hover:text-white text-rose-400 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg">
              <ShieldAlert size={32} /> TRAP (False)
            </button>
          </div>
        ) : (
          <div className="mt-8 p-8 bg-slate-900 border border-slate-700 rounded-3xl animate-in slide-in-from-bottom-4 text-center shadow-xl">
            {selectedAnswer === currentItem.is_true ? (
              <div className="text-emerald-400 font-black text-2xl mb-3 flex items-center justify-center gap-2"><CheckCircle2 size={28}/> Correct Analysis!</div>
            ) : (
              <div className="text-rose-400 font-black text-2xl mb-3 flex items-center justify-center gap-2"><XCircle size={28}/> You fell for the trap!</div>
            )}
            <p className="text-slate-300 text-lg mb-8 bg-slate-950 p-6 rounded-2xl inline-block text-left w-full leading-relaxed border border-slate-800">
              <span className="font-bold text-amber-400 text-sm uppercase block mb-2">The Catch:</span> 
              {currentItem.catch}
            </p>
            <button onClick={handleNext} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition shadow-lg">
              Next Statement <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Flashcards remain similar (just styled larger)
  if (gameType === 'flashcards') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8 fade-in duration-300 flex flex-col items-center">
        <div className="text-sm font-bold text-slate-500 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800 w-full text-center">
          Card {currentIndex + 1} of {gameData.length}
        </div>
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full aspect-[4/3] bg-slate-800 border-2 border-slate-700 rounded-3xl cursor-pointer hover:border-sky-500 transition-all duration-500 flex flex-col items-center justify-center p-10 text-center shadow-2xl group relative overflow-hidden"
        >
          <div className="absolute top-6 right-6 text-slate-600 group-hover:text-sky-400 transition"><RotateCw size={24} /></div>
          {!isFlipped ? (
            <div className="animate-in fade-in duration-300">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-5 block">Term / Concept</span>
              <h3 className="text-3xl font-black text-white leading-snug">{currentItem.front}</h3>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-5 block">Definition</span>
              <p className="text-xl font-semibold text-slate-200 leading-relaxed">{currentItem.back}</p>
            </div>
          )}
        </div>
        <button onClick={handleNext} className="px-10 py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-lg rounded-2xl flex items-center gap-3 transition w-full justify-center shadow-xl">
          Next Card <ArrowRight size={20} />
        </button>
      </div>
    );
  }
  return null;
}