import { useState, useEffect } from 'react';
import { askAITutor } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2, Zap, AlertOctagon, FastForward, Highlighter,
  BookmarkPlus, Bot, X, Bookmark, ChevronRight, ChevronLeft, BookOpen,
  Calculator, LayoutGrid, HelpCircle, Image as ImageIcon, Lightbulb, Gamepad2, Layers
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

// --- UTILITY COMPONENTS & FUNCTIONS ---

const HighlightedText = ({ text, highlights, onRemoveHighlight }) => {
  if (!text) return null;
  if (!highlights || highlights.length === 0) return <span>{text}</span>;

  const matchingHighlights = highlights.filter(h => text.includes(h.text)).sort((a, b) => b.text.length - a.text.length);
  if (matchingHighlights.length === 0) return <span>{text}</span>;

  const hl = matchingHighlights[0];
  const parts = text.split(hl.text);

  return (
    <span>
      <HighlightedText text={parts[0]} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
      <mark
        className={`${hl.colorClass} rounded px-1 cursor-pointer hover:opacity-70 transition-colors`}
        onClick={(e) => { e.stopPropagation(); onRemoveHighlight(hl.text); }}
        title="Click to erase highlight"
      >
        {hl.text}
      </mark>
      <HighlightedText text={parts.slice(1).join(hl.text)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
    </span>
  );
};

const cleanMD = (str) => typeof str === 'string' ? str.replace(/\*\*/g, '') : str;


// --- COMPONENT 1: THE DYNAMIC SLIDE RENDERER ---
// This component strictly handles mapping AI data to beautiful UI layouts.

const SlideRenderer = ({
  chapter,
  activeStep,
  highlights,
  onRemoveHighlight,
  quizSelections,
  onQuizSelect,
  matchGameState,
  setMatchGameState
}) => {
  const data = chapter.content_data;

  // Fallback for older data that doesn't have the new 'type' structure
  if (!chapter.type || !data) {
    return (
      <div className="prose prose-invert prose-lg max-w-none text-slate-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{chapter.content || chapter.core_concept || ''}</ReactMarkdown>
      </div>
    );
  }

  // Image Renderer (Fixed Cropping)
  const ImageBlock = () => chapter.image_url ? (
    <div className="w-full mb-8 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/80 flex justify-center shadow-lg">
      <img src={chapter.image_url} alt={chapter.heading} className="w-full h-auto object-contain max-h-[500px]" />
    </div>
  ) : chapter.image_request?.is_needed ? (
    <div className="w-full mb-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-slate-500">
      <ImageIcon size={32} className="mb-2 opacity-50" />
      <span className="text-xs font-bold uppercase tracking-wider">Image Requested by AI</span>
      <span className="text-xs mt-1 text-center max-w-sm">{chapter.image_request.art_prompt}</span>
    </div>
  ) : null;

  switch (chapter.type) {
    case 'definition':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="bg-brand-950/20 border border-brand-500/30 rounded-3xl p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-4 bg-brand-500/20 rounded-2xl text-brand-400 shrink-0">
                <Lightbulb size={28} />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-3">{data.term}</h4>
                <p className="text-lg text-slate-300 leading-relaxed">
                  <HighlightedText text={cleanMD(data.explanation)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'comparison':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-sky-950/20 border border-sky-500/30 p-8 rounded-3xl shadow-lg">
              <h4 className="text-xl font-bold text-sky-400 mb-6 flex items-center gap-3 border-b border-sky-500/20 pb-4">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center"><CheckCircle2 size={16} /></div>
                {data.left_title}
              </h4>
              <ul className="space-y-4">
                {data.left_points?.map((pt, i) => (
                  <li key={i} className="flex gap-4 text-slate-200 text-lg leading-relaxed">
                    <span className="text-sky-500 shrink-0 mt-1">•</span>
                    <HighlightedText text={cleanMD(pt)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-purple-950/20 border border-purple-500/30 p-8 rounded-3xl shadow-lg">
              <h4 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-3 border-b border-purple-500/20 pb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center"><CheckCircle2 size={16} /></div>
                {data.right_title}
              </h4>
              <ul className="space-y-4">
                {data.right_points?.map((pt, i) => (
                  <li key={i} className="flex gap-4 text-slate-200 text-lg leading-relaxed">
                    <span className="text-purple-500 shrink-0 mt-1">•</span>
                    <HighlightedText text={cleanMD(pt)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );

    case 'formula':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-10 shadow-lg">

            <div className="flex-1 w-full text-center bg-slate-900 py-8 px-4 rounded-3xl border border-amber-500/20 shadow-inner relative overflow-hidden flex flex-col justify-center min-h-[150px]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>

              {/* FIXED: Reduced font scale to prevent scrollbars */}
              <div className="text-amber-400 overflow-x-auto custom-scrollbar w-full text-sm sm:text-base lg:text-lg px-2">
                <BlockMath math={data.equation || ''} />
              </div>

            </div>

            <div className="flex-1 w-full space-y-4">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calculator size={16} /> Variables
              </h5>
              {data.variables?.map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-200 text-base bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <HighlightedText text={cleanMD(v)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                </div>
              ))}
            </div>

          </div>
          {data.explanation && <p className="text-slate-300 text-base md:text-lg text-center mt-6 italic px-4">{data.explanation}</p>}
        </div>
      );

    case 'takeaways':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="space-y-4">
            {data.points?.map((pt, i) => {
              // Backward compatibility check for older string-based takeaways
              const isObject = typeof pt === 'object' && pt !== null;
              const term = isObject ? pt.term : null;
              const desc = isObject ? pt.desc : pt;

              return (
                <div key={i} className="flex items-start gap-5 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl shadow-sm hover:border-brand-500/40 transition">
                  <div className="w-12 h-12 shrink-0 bg-brand-500 text-slate-950 rounded-full flex items-center justify-center font-black text-xl shadow-lg">
                    {i + 1}
                  </div>
                  <div className="mt-2 leading-relaxed">
                    {term && <span className="font-black text-brand-400 text-lg mr-2">{term}:</span>}
                    <span className="text-lg text-slate-200">
                      <HighlightedText text={cleanMD(desc)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'grid':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.items?.map((item, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-700/80 p-6 rounded-3xl flex flex-col items-center text-center shadow-md hover:border-brand-400/50 transition group relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-brand-500/20 group-hover:bg-brand-500/50 transition"></div>
                <div className="w-14 h-14 bg-slate-800 text-brand-400 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition shadow-inner">
                  <LayoutGrid size={24} />
                </div>
                <h5 className="font-bold text-white text-xl mb-3">{item.title}</h5>
                <p className="text-base text-slate-400 leading-relaxed">
                  <HighlightedText text={cleanMD(item.desc)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'theory':
      return (
        <div className="space-y-6">
          <ImageBlock />
          <div className="space-y-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50">
            {data.paragraphs?.map((para, i) => (
              <p key={i} className="text-xl text-slate-200 leading-loose">
                <HighlightedText text={cleanMD(para)} highlights={highlights} onRemoveHighlight={onRemoveHighlight} />
              </p>
            ))}
          </div>
        </div>
      );

    case 'quick_quiz': {
      const isAnswered = quizSelections[activeStep];
      const isCorrect = isAnswered === data.correct;
      return (
        <div className="bg-indigo-950/20 border border-indigo-500/30 p-8 md:p-10 rounded-3xl max-w-3xl mx-auto shadow-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-indigo-500/20 pb-6">
            <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400"><HelpCircle size={28} /></div>
            <h3 className="text-2xl md:text-3xl font-black text-white">Quick Knowledge Check</h3>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mb-8 leading-relaxed">{data.question}</p>
          <div className="space-y-4">
            {data.options?.map((opt, i) => {
              const isSelected = isAnswered === opt;
              let btnStyle = "bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-400";

              if (isAnswered) {
                if (opt === data.correct) btnStyle = "bg-emerald-950/50 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                else if (isSelected) btnStyle = "bg-rose-950/30 border-rose-500 text-rose-400 line-through opacity-70";
                else btnStyle = "bg-slate-900 border-slate-800 text-slate-600 opacity-40";
              }

              return (
                <button
                  key={i}
                  disabled={isAnswered}
                  onClick={() => onQuizSelect(opt)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition text-lg flex items-center ${btnStyle}`}
                >
                  <span className="inline-block w-10 h-10 rounded-xl bg-slate-950/50 text-center leading-[40px] mr-4 font-mono font-bold shrink-0">{['A', 'B', 'C', 'D'][i]}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {isAnswered && (
            <div className={`mt-8 p-6 rounded-3xl border flex gap-5 animate-in slide-in-from-bottom-2 ${isCorrect ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
              {isCorrect ? <CheckCircle2 size={32} className="text-emerald-500 shrink-0 mt-1" /> : <AlertOctagon size={32} className="text-rose-500 shrink-0 mt-1" />}
              <div>
                <h4 className={`text-lg font-bold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>{isCorrect ? 'Excellent!' : 'Not quite.'}</h4>
                <p className="text-slate-300 text-base leading-relaxed">{data.explanation}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'interactive_match': {
      if (!data.pairs) return null;

      // Stabilize scrambling by sorting alphabetically so it doesn't jump around on re-renders
      const rightOptions = [...data.pairs].map(p => p.right).sort((a, b) => a.localeCompare(b));

      const handleMatchClick = (side, text, index) => {
        if (matchGameState.matched.includes(text)) return;

        if (side === 'left') {
          setMatchGameState({ ...matchGameState, selectedLeft: text });
        } else if (side === 'right' && matchGameState.selectedLeft) {
          const correctPair = data.pairs.find(p => p.left === matchGameState.selectedLeft);
          if (correctPair && correctPair.right === text) {
            setMatchGameState({
              selectedLeft: null,
              matched: [...matchGameState.matched, matchGameState.selectedLeft, text]
            });
          } else {
            setMatchGameState({ ...matchGameState, selectedLeft: null });
          }
        }
      };

      const isFullyMatched = matchGameState.matched.length === (data.pairs.length * 2);

      return (
        <div className="bg-slate-900/80 border border-brand-500/30 p-8 rounded-3xl max-w-4xl mx-auto shadow-2xl">
          <div className="flex items-center gap-4 mb-6 border-b border-brand-500/20 pb-4">
            <div className="p-3 bg-brand-500/20 rounded-xl text-brand-400"><Gamepad2 size={28} /></div>
            <div>
              <h3 className="text-2xl font-black text-white">Match the Pairs</h3>
              <p className="text-sm text-slate-400">{data.instructions || "Select an item on the left, then click its match on the right."}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Left Column */}
            <div className="space-y-3">
              {data.pairs.map((pair, i) => {
                const isMatched = matchGameState.matched.includes(pair.left);
                const isSelected = matchGameState.selectedLeft === pair.left;

                return (
                  <button
                    key={`l-${i}`}
                    onClick={() => handleMatchClick('left', pair.left, i)}
                    disabled={isMatched}
                    className={`w-full p-4 rounded-xl text-left font-semibold transition border-2
                      ${isMatched ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-500 opacity-50'
                        : isSelected ? 'bg-brand-500/20 border-brand-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-brand-400 hover:bg-slate-800'}`}
                  >
                    {pair.left}
                  </button>
                )
              })}
            </div>

            {/* Right Column (Scrambled) */}
            <div className="space-y-3">
              {rightOptions.map((rightText, i) => {
                const isMatched = matchGameState.matched.includes(rightText);

                return (
                  <button
                    key={`r-${i}`}
                    onClick={() => handleMatchClick('right', rightText, i)}
                    disabled={isMatched || !matchGameState.selectedLeft}
                    className={`w-full p-4 rounded-xl text-left font-semibold transition border-2
                      ${isMatched ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-500 opacity-50'
                        : matchGameState.selectedLeft ? 'bg-slate-950 border-sky-700 text-slate-300 hover:border-sky-400 hover:bg-slate-800 cursor-pointer'
                          : 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'}`}
                  >
                    {rightText}
                  </button>
                )
              })}
            </div>
          </div>

          {isFullyMatched && (
            <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={24} /> Perfect Match! You can proceed to the next slide.
            </div>
          )}
        </div>
      );
    }

    default: return null;
  }
};


// --- COMPONENT 2: THE MAIN PARENT CONTAINER ---
// This handles State, Menus, Modals, Pagination, and passes data down to the SlideRenderer.

export default function LearningEngine({ mission, onComplete, onMemorize, onHighlight }) {
  const stepKey = `psc_mission_${mission?.dayNumber}_step`;
  const highlightsKey = `psc_mission_${mission?.dayNumber}_highlights`;
  const vaultKey = `psc_mission_${mission?.dayNumber}_vault`;

  const [activeStep, setActiveStep] = useState(() => parseInt(localStorage.getItem(stepKey)) || 0);
  const [highlights, setHighlights] = useState(() => JSON.parse(localStorage.getItem(highlightsKey) || '[]'));
  const [savedVault, setSavedVault] = useState(() => JSON.parse(localStorage.getItem(vaultKey) || '[]'));

  const [selectionMenu, setSelectionMenu] = useState(null);
  const [aiModal, setAiModal] = useState({ isOpen: false, query: '', response: '', loading: false });

  const [quizSelections, setQuizSelections] = useState({});
  const [matchGameState, setMatchGameState] = useState({ selectedLeft: null, matched: [] });

  const chapters = mission?.curriculumData?.study_material || [];
  const quickRevision = mission?.curriculumData?.quick_revision || [];
  const isReadingFinished = activeStep >= chapters.length;
  const currentChapter = chapters[activeStep];

  useEffect(() => {
    if (isReadingFinished && chapters.length > 0) onComplete();
  }, [isReadingFinished, onComplete, chapters.length]);

  const handleMouseUp = (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 0) {
      setSelectionMenu({ text, x: e.clientX, y: e.clientY - 50 });
    } else {
      setSelectionMenu(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectionMenu && !e.target.closest('#floating-menu')) setSelectionMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu]);

  const handleAddHighlight = (colorClass) => {
    if (selectionMenu && !highlights.find(h => h.text === selectionMenu.text)) {
      const newHighlight = { text: selectionMenu.text, colorClass };
      const updatedHighlights = [...highlights, newHighlight];
      setHighlights(updatedHighlights);
      localStorage.setItem(highlightsKey, JSON.stringify(updatedHighlights));
      if (onHighlight) onHighlight(selectionMenu.text, currentChapter?.heading || `Day ${mission?.dayNumber} Reading`);
    }
    window.getSelection().removeAllRanges();
    setSelectionMenu(null);
  };

  const handleRemoveHighlight = (textToRemove) => {
    const updatedHighlights = highlights.filter(h => h.text !== textToRemove);
    setHighlights(updatedHighlights);
    localStorage.setItem(highlightsKey, JSON.stringify(updatedHighlights));
  };

  const handleSaveToVault = (text, type = 'line') => {
    if (!savedVault.find(item => item.text === text)) {
      const updatedVault = [...savedVault, { text, type }];
      setSavedVault(updatedVault);
      localStorage.setItem(vaultKey, JSON.stringify(updatedVault));
      if (onMemorize) {
        const heading = type === 'ai_note' ? `AI Note (Day ${mission?.dayNumber})` : (currentChapter?.heading || `Day ${mission?.dayNumber} Vault`);
        onMemorize(heading, text);
      }
    }
    window.getSelection().removeAllRanges();
    setSelectionMenu(null);
  };

  const handleAskAI = async () => {
    const queryText = selectionMenu.text;
    window.getSelection().removeAllRanges();
    setSelectionMenu(null);

    // 1. Set loading to true, but keep isOpen FALSE so it runs in the background
    setAiModal({ isOpen: false, query: queryText, response: '', loading: true });

    try {
      const context = `Module: ${mission.title}. Explain this specific point clearly for a PSC exam student in simple terms.`;
      const aiResponse = await askAITutor(queryText, context);

      // 2. Once the AI answers, pop open the modal
      setAiModal({ isOpen: true, query: queryText, response: aiResponse, loading: false });
    } catch (error) {
      // 3. If it fails, pop open the modal to show the error
      setAiModal({ isOpen: true, query: queryText, response: `⚠️ ${error.message}`, loading: false });
    }
  };

  const handlePrevPage = () => {
    if (activeStep > 0) {
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
      localStorage.setItem(stepKey, prevStep.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    localStorage.setItem(stepKey, nextStep.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nextStep >= chapters.length) onComplete();
  };

  const handleQuizSelect = (option) => {
    setQuizSelections(prev => ({ ...prev, [activeStep]: option }));
  };

  return (
    <div className="p-4 md:p-8 bg-civil-dark/50 flex flex-col relative min-h-[60vh]">

      {selectionMenu && (
        <div id="floating-menu" className="fixed z-50 flex items-center gap-2 p-1.5 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl animate-in zoom-in-95 duration-100" style={{ top: selectionMenu.y, left: selectionMenu.x, transform: 'translateX(-50%)' }}>
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-700">
            <Highlighter size={14} className="text-slate-400 mr-1" />
            <button onClick={() => handleAddHighlight('bg-amber-500/40 text-amber-50')} className="w-5 h-5 rounded-full bg-amber-500 hover:scale-110 transition shadow"></button>
            <button onClick={() => handleAddHighlight('bg-emerald-500/40 text-emerald-50')} className="w-5 h-5 rounded-full bg-emerald-500 hover:scale-110 transition shadow"></button>
            <button onClick={() => handleAddHighlight('bg-pink-500/40 text-pink-50')} className="w-5 h-5 rounded-full bg-pink-500 hover:scale-110 transition shadow"></button>
          </div>
          <button onClick={() => handleSaveToVault(selectionMenu.text)} className="px-2 py-1 hover:bg-slate-700 text-emerald-400 rounded transition flex items-center gap-1 text-xs font-bold">
            <BookmarkPlus size={14} /> Memorize
          </button>
          <div className="w-px h-5 bg-slate-700"></div>
          <button onClick={handleAskAI} className="px-2 py-1 hover:bg-slate-700 text-brand-400 rounded transition flex items-center gap-1 text-xs font-bold">
            <Bot size={14} /> Ask AI
          </button>
        </div>
      )}
      
      {/* 🚀 NEW: Background Loading Indicator Toast */}
      {aiModal.loading && !aiModal.isOpen && (
        <div className="fixed bottom-8 right-8 z-50 bg-slate-900 border border-brand-500/40 p-4 rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.2)] flex items-center gap-4 animate-in slide-in-from-bottom-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
          <div>
            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-0.5">AE Chettan is thinking...</p>
            <p className="text-sm text-slate-300 max-w-[200px] truncate">"{aiModal.query}"</p>
          </div>
        </div>
      )}

      {aiModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-brand-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-brand-950/30 border-b border-brand-500/20 flex justify-between items-start shrink-0 select-none">
              <div>
                <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><Bot size={12} /> AE Chettan Explains</span>
                <p className="text-slate-300 text-sm mt-1 italic border-l-2 border-slate-700 pl-2 line-clamp-2">"{aiModal.query}"</p>
              </div>
              <button onClick={() => setAiModal({ isOpen: false, query: '', response: '', loading: false })} className="text-slate-500 hover:text-rose-400 transition p-1 bg-slate-800 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 text-base overflow-y-auto custom-scrollbar flex-1 prose prose-invert max-w-none text-slate-200">
              {aiModal.loading ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-10">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-brand-400 animate-pulse">Consulting AE Chettan...</span>
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiModal.response}</ReactMarkdown>
              )}
            </div>
            {!aiModal.loading && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 select-none">
                <button
                  onClick={() => { handleSaveToVault(`**AI Note on "${aiModal.query}":**\n\n${aiModal.response}`, 'ai_note'); setAiModal({ isOpen: false, query: '', response: '', loading: false }); }}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm rounded-xl flex justify-center items-center gap-2 transition shadow-lg"
                >
                  <BookmarkPlus size={16} /> Save Explanation to My Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SINGLE BOOK PAGE VIEW --- */}
      {!isReadingFinished && currentChapter && (
        <div className="flex flex-col flex-1 bg-slate-900/95 border border-slate-700 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-4 fade-in duration-300">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6 select-none">
            <div>
              {/* 🚀 NEW: CONTEXT BREADCRUMB UI */}
              {currentChapter.context_breadcrumb && (
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Layers size={14} className="text-slate-600" />
                  {currentChapter.context_breadcrumb}
                </div>
              )}

              {currentChapter.badge && (
                <span className="inline-block px-3 py-1 mb-3 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 font-bold text-xs uppercase tracking-widest shadow-sm">
                  {currentChapter.badge}
                </span>
              )}
              <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">{currentChapter.heading}</h3>
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-full items-center justify-center font-black text-2xl bg-slate-800 text-slate-400 shrink-0 shadow-inner">
              {activeStep + 1}
            </div>
          </div>

          <div className="flex-1" onMouseUp={handleMouseUp}>
            {/* 🚀 NEW CLEAN DELEGATION TO THE SLIDE RENDERER COMPONENT */}
            <SlideRenderer
              chapter={currentChapter}
              activeStep={activeStep}
              highlights={highlights}
              onRemoveHighlight={handleRemoveHighlight}
              quizSelections={quizSelections}
              onQuizSelect={handleQuizSelect}
              matchGameState={matchGameState}
              setMatchGameState={setMatchGameState}
            />

            {/* Standard Key Data / Specs Footer (Applies universally if data exists) */}
            {currentChapter.key_data?.length > 0 && (
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner mt-8">
                <h4 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-4 select-none">
                  <Zap size={18} /> Key Specifications & Data
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentChapter.key_data.map((point, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-3 leading-relaxed">
                      <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-sky-500 shrink-0"></span>
                      <span><HighlightedText text={cleanMD(point)} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Standard Trap Footer */}
            {currentChapter.psc_trap && (
              <div className="bg-rose-950/20 border border-rose-500/30 p-6 rounded-2xl flex gap-4 shadow-sm mt-6">
                <AlertOctagon size={28} className="text-rose-500 shrink-0 select-none mt-1" />
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 select-none">Common PSC Trap</h4>
                  <p className="text-base text-rose-200/90 leading-relaxed">
                    <HighlightedText text={cleanMD(currentChapter.psc_trap)} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} />
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="mt-12 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800 select-none">
            
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              {/* Previous Button (Turns invisible on slide 1) */}
              <button 
                onClick={handlePrevPage}
                disabled={activeStep === 0}
                className="px-6 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-0 disabled:cursor-default text-white font-bold text-base md:text-lg rounded-xl shadow-md flex items-center gap-2 transition active:scale-95"
              >
                <ChevronLeft size={20} /> Prev
              </button>

              <span className="text-sm font-bold text-slate-400 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl shrink-0">
                Slide {activeStep + 1} of {chapters.length}
              </span>
            </div>

            {/* Next Button */}
            <button 
              onClick={handleNextPage} 
              disabled={
                (currentChapter.type === 'quick_quiz' && !quizSelections[activeStep]) ||
                (currentChapter.type === 'interactive_match' && matchGameState.matched.length !== (currentChapter.content_data?.pairs?.length || 0) * 2)
              }
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base md:text-lg rounded-xl shadow-xl flex justify-center items-center gap-2 transition active:scale-95"
            >
              {activeStep === chapters.length - 1 ? <><CheckCircle2 size={20} /> Finish & Unlock Drills</> : <>Next Slide <ChevronRight size={20}/></>}
            </button>
            
          </div>
        </div>
      )}

      {/* --- QUICK REVISION & VAULT VIEW --- */}
      {isReadingFinished && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-10">
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-8 shadow-xl select-none">
            <div className="flex items-center gap-4 mb-6 border-b border-emerald-500/20 pb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><FastForward size={28} /></div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-white">Daily Revision Cheat Sheet</h3>
                <p className="text-sm text-emerald-400/80">Memorize these one-liners before starting the drills.</p>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-3" onMouseUp={handleMouseUp}>
              {quickRevision.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5"></div>
                  <span className="text-base md:text-lg text-slate-200 font-semibold leading-relaxed">
                    <HighlightedText text={cleanMD(point)} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {savedVault.length > 0 && (
            <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-8 shadow-xl select-none">
              <div className="flex items-center gap-4 mb-6 border-b border-indigo-500/20 pb-4">
                <Bookmark size={24} className="text-indigo-400" />
                <h3 className="text-xl md:text-2xl font-black text-indigo-100">My Personal Vault</h3>
              </div>
              <div className="grid grid-cols-1 gap-4" onMouseUp={handleMouseUp}>
                {savedVault.map((note, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border text-base ${note.type === 'ai_note' ? 'bg-slate-900 border-brand-500/30 shadow-inner' : 'bg-slate-900/50 border-slate-700'}`}>
                    {note.type === 'ai_note' && <span className="block text-xs text-brand-400 font-bold mb-3 uppercase tracking-widest"><Bot size={14} className="inline mr-1" /> AI Explanation</span>}
                    {note.type === 'ai_note' ? (
                      <div className="prose prose-invert max-w-none text-slate-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-slate-300 leading-relaxed">
                        <HighlightedText text={cleanMD(note.text)} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setActiveStep(0);
                localStorage.setItem(stepKey, '0');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-lg border border-slate-700"
            >
              <BookOpen size={18} className="text-brand-400" /> Re-read Slides from Beginning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}