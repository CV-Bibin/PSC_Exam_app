import { useState, useEffect } from 'react';
import { Bookmark, Highlighter, BrainCircuit, Target, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';

export default function Favorites() {
  const [activeTab, setActiveTab] = useState('questions'); 
  
  const [favoriteQuestions, setFavoriteQuestions] = useState([]);
  const [highlightedLines, setHighlightedLines] = useState([]);
  const [memorizedNotes, setMemorizedNotes] = useState([]);

  useEffect(() => {
    setFavoriteQuestions(JSON.parse(localStorage.getItem('psc_fav_questions') || '[]'));
    setHighlightedLines(JSON.parse(localStorage.getItem('psc_fav_highlights') || '[]'));
    setMemorizedNotes(JSON.parse(localStorage.getItem('psc_fav_memorized') || '[]'));
  }, []);

  const removeQuestion = (idToRemove) => {
    const updated = favoriteQuestions.filter(q => q.id !== idToRemove);
    setFavoriteQuestions(updated);
    localStorage.setItem('psc_fav_questions', JSON.stringify(updated));
  };

  const removeHighlight = (idToRemove) => {
    const updated = highlightedLines.filter(h => h.id !== idToRemove);
    setHighlightedLines(updated);
    localStorage.setItem('psc_fav_highlights', JSON.stringify(updated));
  };

  const removeMemorized = (idToRemove) => {
    const updated = memorizedNotes.filter(m => m.id !== idToRemove);
    setMemorizedNotes(updated);
    localStorage.setItem('psc_fav_memorized', JSON.stringify(updated));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      <div className="bg-civil-card border border-civil-border p-6 md:p-8 rounded-3xl shadow-xl flex items-center gap-4">
        <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-400">
          <Bookmark size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white">My Favorites & Saved Vault</h2>
          <p className="text-slate-400 mt-1">Review your bookmarked exam questions, key highlights, and memorized facts.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4">
        <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={Target} label="Saved Exam Questions" count={favoriteQuestions.length} color="text-rose-400" activeBg="bg-rose-500/10 border-rose-500/50" />
        <TabButton active={activeTab === 'highlights'} onClick={() => setActiveTab('highlights')} icon={Highlighter} label="Highlighted Lines" count={highlightedLines.length} color="text-amber-400" activeBg="bg-amber-500/10 border-amber-500/50" />
        <TabButton active={activeTab === 'memorized'} onClick={() => setActiveTab('memorized')} icon={BrainCircuit} label="Memorized Notes" count={memorizedNotes.length} color="text-emerald-400" activeBg="bg-emerald-500/10 border-emerald-500/50" />
      </div>

      {/* SAVED QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          {favoriteQuestions.length === 0 ? (
            <EmptyState icon={Target} message="No saved exam questions yet. Click the bookmark icon during an exam to save tricky questions here." />
          ) : (
            favoriteQuestions.map((q, idx) => (
              <div key={q.id || idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative group">
                <button onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${q.statement ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {q.statement ? 'Spot The Trap' : 'Multiple Choice'}
                  </span>
                </div>

                {/* HANDLE TRAP VS MCQ DIFFERENTLY */}
                {q.statement ? (
                  <>
                    <h3 className="text-lg font-bold text-white mb-4 leading-relaxed">"{q.statement}"</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${q.is_true === true ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        {q.is_true === true && <CheckCircle2 size={16} />} True (Fact)
                      </div>
                      <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${q.is_true === false ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                        {q.is_true === false && <CheckCircle2 size={16} />} False (Trap)
                      </div>
                    </div>
                    {q.catch && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-400"><strong className="text-amber-400">The Catch:</strong> {q.catch}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-white mb-4 leading-relaxed">{q.question}</h3>
                    <div className="space-y-2 mb-4">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${opt === q.correct_answer ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                          {opt === q.correct_answer && <CheckCircle2 size={16} />} {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-400"><strong className="text-brand-400">Explanation:</strong> {q.explanation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* HIGHLIGHTS TAB */}
      {activeTab === 'highlights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-300">
          {highlightedLines.length === 0 ? (
            <div className="md:col-span-2"><EmptyState icon={Highlighter} message="No highlights yet. Select important sentences during your daily reading to save them here." /></div>
          ) : (
            highlightedLines.map((h, idx) => (
              <div key={h.id || idx} className="bg-slate-900 border-l-4 border-l-amber-500 border-t border-r border-b border-slate-800 p-5 rounded-r-2xl relative group">
                <button onClick={() => removeHighlight(h.id)} className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <BookOpen size={12} /> {h.sourceTopic || 'Daily Reading'}
                </div>
                <p className="text-sm font-medium text-amber-50 leading-relaxed italic">"{h.text}"</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* MEMORIZED TAB */}
      {activeTab === 'memorized' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          {memorizedNotes.length === 0 ? (
            <EmptyState icon={BrainCircuit} message="No memorized data yet. Click the 'Memorize' button on slide content to store critical facts here." />
          ) : (
            memorizedNotes.map((m, idx) => (
              <div key={m.id || idx} className="bg-civil-card border border-civil-border p-6 rounded-2xl relative group shadow-lg">
                <button onClick={() => removeMemorized(m.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1"><BrainCircuit size={10} /> Memorized Fact</span>
                </div>
                <h4 className="text-lg font-black text-brand-400 mb-2">{m.heading}</h4>
                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-800">{m.content}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, color, activeBg }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border ${active ? `${activeBg}${color}` : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
      <Icon size={18} /> {label} <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] ${active ? 'bg-slate-950/50' : 'bg-slate-800 text-slate-500'}`}>{count}</span>
    </button>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="p-12 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center bg-slate-900/30">
      <div className="p-4 bg-slate-800 rounded-full text-slate-500 mb-4"><Icon size={32} /></div>
      <h3 className="text-lg font-bold text-white mb-2">Nothing to show yet</h3>
      <p className="text-sm text-slate-400 max-w-sm">{message}</p>
    </div>
  );
}