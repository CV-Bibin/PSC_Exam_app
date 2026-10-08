import { useState, useEffect } from 'react';
import { askAITutor } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  CheckCircle2, Zap, AlertOctagon, FastForward, Highlighter, BookmarkPlus, Bot, X, Bookmark, ChevronRight, BookOpen 
} from 'lucide-react';

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

export default function LearningEngine({ mission, onComplete, onMemorize, onHighlight }) {
  const stepKey = `psc_mission_${mission?.dayNumber}_step`;
  const highlightsKey = `psc_mission_${mission?.dayNumber}_highlights`;
  const vaultKey = `psc_mission_${mission?.dayNumber}_vault`;

  const [activeStep, setActiveStep] = useState(() => parseInt(localStorage.getItem(stepKey)) || 0); 
  const [highlights, setHighlights] = useState(() => JSON.parse(localStorage.getItem(highlightsKey) || '[]')); 
  const [savedVault, setSavedVault] = useState(() => JSON.parse(localStorage.getItem(vaultKey) || '[]'));
  
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [aiModal, setAiModal] = useState({ isOpen: false, query: '', response: '', loading: false });

  const chapters = mission?.curriculumData?.study_material || [];
  const quickRevision = mission?.curriculumData?.quick_revision || [];
  const isReadingFinished = activeStep >= chapters.length;
  const currentChapter = chapters[activeStep];

  useEffect(() => {
    if (isReadingFinished) onComplete();
  }, [isReadingFinished, onComplete]);

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
      
      if (onHighlight) {
        onHighlight(selectionMenu.text, currentChapter?.heading || `Day ${mission?.dayNumber} Reading`);
      }
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
    setAiModal({ isOpen: true, query: queryText, response: '', loading: true });
    try {
      const context = `Module: ${mission.title}. Explain this specific point clearly for a PSC exam student in simple terms.`;
      const aiResponse = await askAITutor(queryText, context);
      setAiModal(prev => ({ ...prev, response: aiResponse, loading: false }));
    } catch (error) {
      setAiModal(prev => ({ ...prev, response: `⚠️ ${error.message}`, loading: false }));
    }
  };

  const handleNextPage = () => {
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    localStorage.setItem(stepKey, nextStep.toString()); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nextStep >= chapters.length) onComplete();
  };

  return (
    <div className="p-6 md:p-10 bg-civil-dark/50 flex flex-col relative min-h-[60vh]">
      
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

      {aiModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-brand-500/30 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-brand-950/30 border-b border-brand-500/20 flex justify-between items-start shrink-0 select-none">
              <div>
                <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><Bot size={12}/> AE Chettan Explains</span>
                <p className="text-slate-300 text-sm mt-1 italic border-l-2 border-slate-700 pl-2">"{aiModal.query}"</p>
              </div>
              <button onClick={() => setAiModal({ isOpen: false, query: '', response: '', loading: false })} className="text-slate-500 hover:text-rose-400 transition p-1 bg-slate-800 rounded-lg"><X size={20}/></button>
            </div>
            <div className="p-6 text-base text-slate-200 overflow-y-auto custom-scrollbar flex-1 leading-relaxed">
              {aiModal.loading ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-10">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-brand-400 animate-pulse">Consulting AE Chettan...</span>
                </div>
              ) : (
                <div className="prose prose-invert prose-base max-w-none prose-headings:text-amber-100 prose-a:text-brand-400 prose-strong:text-brand-300 prose-ul:marker:text-brand-500">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiModal.response}</ReactMarkdown>
                </div>
              )}
            </div>
            {!aiModal.loading && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 select-none">
                <button 
                  onClick={() => { handleSaveToVault(`**AI Note on "${aiModal.query}":**\n\n${aiModal.response}`, 'ai_note'); setAiModal({ isOpen: false, query: '', response: '', loading: false }); }}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm rounded-xl flex justify-center items-center gap-2 transition shadow-lg"
                >
                  <BookmarkPlus size={16}/> Save Explanation to My Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SINGLE BOOK PAGE VIEW --- */}
      {!isReadingFinished && currentChapter && (
        <div className="flex flex-col flex-1 bg-slate-900/80 border border-brand-500/20 rounded-3xl p-8 md:p-12 shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-6 select-none">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl bg-brand-500 text-slate-950 shrink-0 shadow-lg">
              {activeStep + 1}
            </div>
            <h3 className="text-3xl font-black text-white leading-tight">{currentChapter.heading}</h3>
          </div>

          <div className="space-y-10 flex-1" onMouseUp={handleMouseUp}>
            {/* THE FIX: Added whitespace-pre-wrap to this paragraph */}
            <p className="text-xl text-slate-200 leading-loose whitespace-pre-wrap">
              <HighlightedText text={currentChapter.content || currentChapter.core_concept} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} />
            </p>
            
            {currentChapter.key_data?.length > 0 && (
              <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800/80 shadow-inner">
                <h4 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-6 select-none">
                  <Zap size={18} /> Key Specifications & Data
                </h4>
                <ul className="space-y-5">
                  {currentChapter.key_data.map((point, i) => (
                    <li key={i} className="text-lg text-slate-300 flex items-start gap-4 leading-relaxed whitespace-pre-wrap">
                      <span className="text-brand-500 mt-1 shrink-0 select-none">•</span>
                      <span><HighlightedText text={point} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentChapter.psc_trap && (
              <div className="bg-rose-950/20 border border-rose-500/30 p-8 rounded-2xl flex gap-5 shadow-sm">
                <AlertOctagon size={32} className="text-rose-500 shrink-0 select-none" />
                <div>
                  <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-3 select-none">Common PSC Trap</h4>
                  <p className="text-lg text-rose-200/90 leading-relaxed whitespace-pre-wrap">
                    <HighlightedText text={currentChapter.psc_trap} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} />
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 flex items-center justify-between pt-8 border-t border-slate-800 select-none">
            <span className="text-base font-bold text-slate-500 bg-slate-800 px-5 py-2 rounded-full">
              Page {activeStep + 1} of {chapters.length}
            </span>
            <button onClick={handleNextPage} className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center gap-3 transition active:scale-95">
              {activeStep === chapters.length - 1 ? <><CheckCircle2 size={24} /> Finish & Unlock Drills</> : <>Acknowledge & Next Page <ChevronRight size={24}/></>}
            </button>
          </div>
        </div>
      )}

      {/* --- QUICK REVISION & VAULT VIEW --- */}
      {isReadingFinished && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 fade-in duration-500 pb-10">
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-8 md:p-12 shadow-xl select-none">
            <div className="flex items-center gap-4 mb-8 border-b border-emerald-500/20 pb-6">
              <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400"><FastForward size={32} /></div>
              <div>
                <h3 className="text-2xl font-black text-white">Daily Revision Cheat Sheet</h3>
                <p className="text-base text-emerald-400/80">Memorize these one-liners before starting the drills.</p>
              </div>
            </div>
            
            <ul className="space-y-5" onMouseUp={handleMouseUp}>
              {quickRevision.map((point, idx) => (
                <li key={idx} className="flex items-center gap-5 bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0"></div>
                  <span className="text-lg text-slate-200 font-semibold leading-relaxed whitespace-pre-wrap"><HighlightedText text={point} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} /></span>
                </li>
              ))}
            </ul>
          </div>

          {savedVault.length > 0 && (
            <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-8 md:p-12 shadow-xl select-none">
              <div className="flex items-center gap-4 mb-8 border-b border-indigo-500/20 pb-6">
                <Bookmark size={28} className="text-indigo-400" />
                <h3 className="text-2xl font-black text-indigo-100">My Personal Vault</h3>
              </div>
              <div className="space-y-5" onMouseUp={handleMouseUp}>
                {savedVault.map((note, idx) => (
                  <div key={idx} className={`p-6 rounded-2xl border text-lg ${note.type === 'ai_note' ? 'bg-slate-900 border-brand-500/30 shadow-inner' : 'bg-slate-900/50 border-slate-700'}`}>
                    {note.type === 'ai_note' && <span className="block text-sm text-brand-400 font-bold mb-4 uppercase tracking-widest"><Bot size={16} className="inline mr-2"/> AI Explanation</span>}
                    {note.type === 'ai_note' ? (
                      <div className="prose prose-invert prose-lg max-w-none prose-headings:text-amber-100 prose-a:text-brand-400 prose-strong:text-brand-300 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-slate-300 whitespace-pre-wrap leading-relaxed"><HighlightedText text={note.text} highlights={highlights} onRemoveHighlight={handleRemoveHighlight} /></span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button 
              onClick={() => {
                setActiveStep(0);
                localStorage.setItem(stepKey, '0');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center gap-3 transition shadow-lg border border-slate-700"
            >
              <BookOpen size={20} className="text-brand-400" /> Re-read Slides from the Beginning
            </button>
          </div>

        </div>
      )}
    </div>
  );
}