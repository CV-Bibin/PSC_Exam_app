import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bookmark, Highlighter, BrainCircuit, Target, Trash2, 
  BookOpen, CheckCircle2, Bot, Users, Layers, Quote 
} from 'lucide-react';

export default function Favorites() {
  const [activeTab, setActiveTab] = useState('memorized'); 
  
  const [favoriteQuestions, setFavoriteQuestions] = useState([]);
  const [highlightedLines, setHighlightedLines] = useState([]);
  const [memorizedNotes, setMemorizedNotes] = useState([]);

 // 🚀 Pull Vault data from Firebase user profile
  const { profile, updateCloudProgress } = useAuth();

  useEffect(() => {
    setFavoriteQuestions(profile?.favQuestions || []);
    setHighlightedLines(profile?.favHighlights || []);
    setMemorizedNotes(profile?.favMemorized || []);
  }, [profile]);

 const removeQuestion = (idToRemove) => {
    if (window.confirm("Remove this question from your favorites?")) {
      const updated = favoriteQuestions.filter(q => q.id !== idToRemove);
      setFavoriteQuestions(updated);
      updateCloudProgress({ favQuestions: updated }); // 🚀 Cloud Sync
    }
  };

  const removeHighlight = (idToRemove) => {
    if (window.confirm("Remove this highlight?")) {
      const updated = highlightedLines.filter(h => h.id !== idToRemove);
      setHighlightedLines(updated);
      updateCloudProgress({ favHighlights: updated }); // 🚀 Cloud Sync
    }
  };

  const removeMemorized = (idToRemove) => {
    if (window.confirm("Remove this insight from your vault?")) {
      const updated = memorizedNotes.filter(m => m.id !== idToRemove);
      setMemorizedNotes(updated);
      updateCloudProgress({ favMemorized: updated }); // 🚀 Cloud Sync
    }
  };

  // --- SMART CATEGORIZATION LOGIC ---
  const groupedNotes = {
    ai: [],
    community: [],
    reading: []
  };

  memorizedNotes.forEach(note => {
    const heading = (note.heading || '').toLowerCase();
    if (note.type === 'ai_note' || heading.includes('ai note') || heading.includes('ai explanation')) {
      groupedNotes.ai.push(note);
    } else if (note.type === 'community_note' || heading.includes('community insight')) {
      groupedNotes.community.push(note);
    } else {
      groupedNotes.reading.push(note);
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* HEADER */}
      <div className="bg-civil-card/70 backdrop-blur-md p-8 rounded-3xl border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 shadow-2xl flex items-center gap-6">
        <div className="p-4 bg-brand-500/20 border border-brand-500/30 rounded-2xl text-brand-400 shadow-inner">
          <Bookmark size={36} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Memory Vault</h1>
          <p className="text-brand-400 font-bold tracking-widest uppercase text-xs mt-2">Your Personal PSC Knowledge Base</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4">
        <TabButton active={activeTab === 'memorized'} onClick={() => setActiveTab('memorized')} icon={BrainCircuit} label="Vault Notes" count={memorizedNotes.length} color="text-emerald-400" activeBg="bg-emerald-500/10 border-emerald-500/50" />
        <TabButton active={activeTab === 'highlights'} onClick={() => setActiveTab('highlights')} icon={Highlighter} label="Highlights" count={highlightedLines.length} color="text-amber-400" activeBg="bg-amber-500/10 border-amber-500/50" />
        <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={Target} label="Saved Questions" count={favoriteQuestions.length} color="text-rose-400" activeBg="bg-rose-500/10 border-rose-500/50" />
      </div>

      {/* --- MEMORIZED VAULT TAB (PRO-LEVEL VIEW) --- */}
      {activeTab === 'memorized' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-300">
          {memorizedNotes.length === 0 ? (
            <EmptyState icon={BrainCircuit} message="No memorized data yet. Save insights from the chat or reading modules to build your vault." />
          ) : (
            <>
              <VaultSection 
                title="AI Explanations" 
                icon={Bot} 
                notes={groupedNotes.ai} 
                onRemove={removeMemorized} 
                colorTheme="sky"
              />
              <VaultSection 
                title="Community Discussions" 
                icon={Users} 
                notes={groupedNotes.community} 
                onRemove={removeMemorized}
                colorTheme="amber" 
              />
              <VaultSection 
                title="Study Material Notes" 
                icon={BookOpen} 
                notes={groupedNotes.reading} 
                onRemove={removeMemorized} 
                colorTheme="emerald"
              />
            </>
          )}
        </div>
      )}

      {/* --- HIGHLIGHTS TAB --- */}
      {activeTab === 'highlights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          {highlightedLines.length === 0 ? (
            <div className="md:col-span-2"><EmptyState icon={Highlighter} message="No highlights yet. Select important sentences during your daily reading to save them here." /></div>
          ) : (
            highlightedLines.map((h, idx) => (
              <div key={h.id || idx} className="bg-slate-900/80 border-l-4 border-l-amber-500 border-t border-r border-b border-slate-800 p-6 rounded-r-3xl relative group shadow-lg hover:border-amber-500/30 transition">
                <button onClick={() => removeHighlight(h.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  <Layers size={14} /> {h.sourceTopic || 'Daily Reading'}
                </div>
                <div className="flex gap-3">
                  <Quote size={20} className="text-amber-500/40 shrink-0 mt-1" />
                  <p className="text-base font-medium text-amber-50 leading-relaxed italic">"{h.text}"</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- SAVED QUESTIONS TAB --- */}
      {activeTab === 'questions' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {favoriteQuestions.length === 0 ? (
            <EmptyState icon={Target} message="No saved exam questions yet. Click the bookmark icon during an exam to save tricky questions here." />
          ) : (
            favoriteQuestions.map((q, idx) => (
              <div key={q.id || idx} className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl relative group shadow-xl hover:border-slate-700 transition">
                <button onClick={() => removeQuestion(q.id)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                
                <div className="flex items-center gap-2 mb-5">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${q.statement ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {q.statement ? 'Spot The Trap' : 'Multiple Choice'}
                  </span>
                </div>

                {q.statement ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">"{q.statement}"</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 ${q.is_true === true ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {q.is_true === true && <CheckCircle2 size={18} />} True (Fact)
                      </div>
                      <div className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 ${q.is_true === false ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {q.is_true === false && <CheckCircle2 size={18} />} False (Trap)
                      </div>
                    </div>
                    {q.catch && (
                      <div className="mt-6 pt-6 border-t border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                        <p className="text-sm text-slate-300 leading-relaxed"><strong className="text-amber-400 uppercase tracking-widest text-xs block mb-1">The Catch</strong> {q.catch}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">{q.question}</h3>
                    <div className="space-y-3 mb-6">
                      {q.options?.map((opt, i) => (
                        <div key={i} className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-3 ${opt === q.correct_answer ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                          {opt === q.correct_answer && <CheckCircle2 size={18} />} {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-6 pt-6 border-t border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                        <p className="text-sm text-slate-300 leading-relaxed"><strong className="text-sky-400 uppercase tracking-widest text-xs block mb-1">Explanation</strong> {q.explanation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function VaultSection({ title, icon: Icon, notes, onRemove, colorTheme }) {
  if (!notes || notes.length === 0) return null;

  const colorStyles = {
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const currentStyle = colorStyles[colorTheme] || colorStyles.sky;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className={`p-2 rounded-lg border ${currentStyle}`}>
          <Icon size={20} />
        </div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <span className="bg-slate-800 text-slate-400 text-xs font-bold px-2 py-1 rounded-md ml-2">{notes.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {notes.map((note, idx) => (
          <div key={note.id || idx} className="bg-slate-900/80 border border-slate-700/80 p-6 md:p-8 rounded-3xl shadow-xl relative group transition hover:border-slate-500/50">
            
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
              <h3 className={`text-lg font-black flex items-center gap-2 ${currentStyle.split(' ')[0]}`}>
                {note.heading || 'Saved Insight'}
              </h3>
              <button 
                onClick={() => onRemove(note.id)}
                className="p-2 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition opacity-0 group-hover:opacity-100"
                title="Remove from Vault"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* 🚀 CUSTOM PRO-LEVEL MARKDOWN RENDERING */}
            <div className="text-slate-300 leading-relaxed text-lg">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Automatically highlights **bold** text in bright amber
                  strong: ({node, ...props}) => <strong className="text-amber-400 font-bold" {...props} />,
                  
                  // Formats subheadings with a clean emerald border
                  h3: ({node, ...props}) => <h3 className="text-xl font-black text-emerald-400 mt-8 mb-4 border-b border-slate-700/50 pb-2" {...props} />,
                  h4: ({node, ...props}) => <h4 className="text-lg font-bold text-emerald-300 mt-6 mb-3" {...props} />,
                  
                  // Transforms *italics* into a highlighted callout block
                  em: ({node, ...props}) => <span className="bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md not-italic font-semibold mx-1 shadow-sm" {...props} />,
                  
                  // Creates perfectly spaced bullet points with colored markers
                  ul: ({node, ...props}) => <ul className="space-y-3 my-5" {...props} />,
                  li: ({node, ...props}) => (
                    <li className="flex gap-3 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                      <span className="flex-1" {...props} />
                    </li>
                  ),
                  
                  // Formats paragraphs with generous reading spacing
                  p: ({node, ...props}) => <p className="mb-4 leading-loose" {...props} />
                }}
              >
                {note.content || note.text}
              </ReactMarkdown>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, color, activeBg }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border ${active ? `${activeBg} ${color} shadow-inner` : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
      <Icon size={18} /> {label} 
      {count > 0 && <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] ${active ? 'bg-slate-950/50' : 'bg-slate-800 text-slate-500'}`}>{count}</span>}
    </button>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="p-12 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center bg-slate-900/30">
      <div className="p-5 bg-slate-800/50 rounded-2xl text-slate-500 mb-5 border border-slate-700/50"><Icon size={40} /></div>
      <h3 className="text-xl font-black text-white mb-2">Nothing here yet</h3>
      <p className="text-base text-slate-400 max-w-sm leading-relaxed">{message}</p>
    </div>
  );
}