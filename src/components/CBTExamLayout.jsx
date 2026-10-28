import React from 'react';
import { BookmarkPlus, ArrowRight, ArrowLeft, CheckCircle2, Eraser } from 'lucide-react';
import TacticalTimer from './TacticalTimer';

export default function CBTExamLayout({
  gameData,
  currentIndex,
  goToQuestion,
  userAnswers,
  handleOptionClick,
  handleClearResponse, // 🚀 NEW PROB
  handleNext,
  handlePrev,
  handleFinalSubmit,
  handleSaveQuestion,
  curriculumData,
  handleTimeUp,
  viewedQuestions
}) {
  const currentItem = gameData[currentIndex];
  const selectedAnswer = userAnswers[currentIndex];

  const answeredCount = Object.keys(userAnswers).length;
  const notAnsweredCount = viewedQuestions.length - answeredCount;
  const notVisitedCount = gameData.length - viewedQuestions.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-100px)] animate-in fade-in duration-300">
      
      {/* --- LEFT SIDEBAR: NAVIGATION GRID --- */}
      <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 h-full">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Time Remaining</span>
          <TacticalTimer timeLimitMinutes={curriculumData?.timeLimitMinutes || 60} onTimeUp={handleTimeUp} />
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">Exam Status</h4>
          <div className="space-y-3 text-sm font-bold text-slate-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500"></div> Answered</div>
              <span className="text-emerald-400">{answeredCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500"></div> Not Answered</div>
              <span className="text-rose-400">{notAnsweredCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-800 border border-slate-600"></div> Not Visited</div>
              <span className="text-slate-500">{notVisitedCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg flex-1 overflow-y-auto custom-scrollbar">
          <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">Question Palette</h4>
          <div className="grid grid-cols-5 gap-2">
            {gameData.map((_, idx) => {
              const isAnswered = !!userAnswers[idx];
              const isViewed = viewedQuestions.includes(idx);
              const isCurrent = currentIndex === idx;

              let btnClass = "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700";
              if (isAnswered) btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-inner";
              else if (isViewed) btnClass = "bg-rose-500/20 border-rose-500 text-rose-400";

              return (
                <button
                  key={idx}
                  onClick={() => goToQuestion(idx)}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg border font-black text-xs transition-all ${btnClass} ${isCurrent ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: QUESTION AREA --- */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden h-full">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-sm font-black text-white uppercase tracking-widest">Question {currentIndex + 1} of {gameData.length}</span>
          <button 
            onClick={() => handleSaveQuestion(currentItem)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 transition"
          >
            <BookmarkPlus size={14} /> Save to Vault
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <h3 className="text-xl md:text-2xl font-black text-white leading-relaxed mb-8">{currentItem.question}</h3>
          
          <div className="space-y-4">
            {currentItem.options?.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              return (
                <button 
                  key={idx} 
                  onClick={() => handleOptionClick(opt)} 
                  className={`w-full flex items-center gap-4 text-left p-5 rounded-xl border-2 transition-all font-semibold text-lg group ${
                    isSelected 
                    ? 'bg-brand-500/10 border-brand-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'bg-slate-950 border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-brand-500' : 'border-slate-600 group-hover:border-brand-500/50'}`}>
                    {isSelected && <div className="w-3 h-3 bg-brand-500 rounded-full"></div>}
                  </div>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🚀 UPGRADED Bottom Navigation Bar */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-between items-center shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="px-4 md:px-6 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center gap-2 transition"
            >
              <ArrowLeft size={18} /> <span className="hidden md:inline">Previous</span>
            </button>
            
            
          </div>
          
          {currentIndex === gameData.length - 1 ? (
            <button 
              onClick={handleFinalSubmit} 
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 transition"
            >
              <CheckCircle2 size={18} /> Submit
            </button>
          ) : (
            <button 
              onClick={handleNext} 
              className="px-8 py-3 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2 transition"
            >
              Next <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}