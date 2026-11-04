import { useState, useEffect, useRef } from 'react';
import { 
  Pencil, Save, X, Copy, Trash2, Download, 
  Bold, Italic, Underline, Highlighter, Type, 
  Heading1, Heading2, List
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function FieldNotes({ mission, isReadingFinished, activeStep, currentChapter }) {
  const { profile, updateCloudProgress } = useAuth();
  const editorRef = useRef(null);
  const timerRef = useRef(null); // 🚀 FIX 1: Used for debouncing typing speed
  
  const notesKey = `psc_mission_${mission?.dayNumber}_slide_${activeStep}_notes`;
  
  const [notes, setNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // 🚀 FIX 2: REMOVED PROFILE FROM DEPENDENCIES
  // This completely stops the cursor from jumping and fixes the laggy backspace!
  // It now only loads the text exactly once when you flip to a new slide.
  useEffect(() => {
    const loadedNotes = profile?.slideNotes?.[mission?.dayNumber]?.[activeStep] || localStorage.getItem(notesKey) || '';
    setNotes(loadedNotes);
    if (editorRef.current) {
      editorRef.current.innerHTML = loadedNotes;
    }
  }, [activeStep, mission?.dayNumber, notesKey]); 

  // 🚀 FIX 3: DEBOUNCED LOCAL STORAGE
  // Lets you type/backspace as fast as you want without lagging the browser
  const handleInput = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      setNotes(htmlContent);
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(notesKey, htmlContent);
      }, 300);
    }
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleSaveNotesToCloud = () => {
    const currentCloudNotes = profile?.slideNotes || {};
    const currentMissionNotes = currentCloudNotes[mission?.dayNumber] || {};
    
    updateCloudProgress({
      slideNotes: {
        ...currentCloudNotes,
        [mission.dayNumber]: {
          ...currentMissionNotes,
          [activeStep]: notes
        }
      }
    });
    setIsNotesOpen(false);
    toast.success("Page notes saved to cloud!");
  };

  const handleCopy = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.innerText);
      toast.success("Text copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (editorRef.current) {
      const element = document.createElement("a");
      const file = new Blob([editorRef.current.innerText], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `Day_${mission?.dayNumber}_Slide_${activeStep + 1}_Notes.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Page downloaded!");
    }
  };

  const handleClear = () => {
    if (window.confirm("Clear this page completely?")) {
      setNotes('');
      localStorage.setItem(notesKey, '');
      if (editorRef.current) editorRef.current.innerHTML = '';
      toast.success("Page cleared.");
    }
  };

  return (
    <>
      {/* FLOATING PENCIL BUTTON */}
      {!isReadingFinished && (
        <button
          onClick={() => setIsNotesOpen(!isNotesOpen)}
          className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 p-4 md:p-5 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all hover:scale-110 flex items-center justify-center border-4 border-slate-900 ${isNotesOpen ? 'bg-amber-600 text-amber-50 rotate-12' : 'bg-amber-500 text-slate-950 group'}`}
          title={isNotesOpen ? "Close Notebook" : "Open Notebook"}
        >
          {isNotesOpen ? <X size={24} /> : <Pencil size={24} className="group-hover:-rotate-12 transition-transform" />}
        </button>
      )}

      {/* FLOATING RICH-TEXT NOTEBOOK */}
      {isNotesOpen && !isReadingFinished && (
        <div 
          className="fixed bottom-24 right-6 md:right-10 z-[60] bg-[#faf9f6] rounded-r-3xl rounded-l-md shadow-[20px_20px_60px_rgba(0,0,0,0.6)] flex flex-col border-y-2 border-r-2 border-amber-900/30 overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-200"
          style={{ 
            width: '450px', height: '600px', 
            minWidth: '320px', minHeight: '400px', 
            maxWidth: '90vw', maxHeight: '80vh',
            resize: 'both' 
          }}
        >
          {/* SPIRAL BINDING EFFECT */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-800 border-r-2 border-slate-900 flex flex-col justify-evenly py-4 z-10 pointer-events-none shadow-[inset_-4px_0_10px_rgba(0,0,0,0.5)]">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-5 h-2 bg-slate-300 ml-3 rounded-full shadow-sm border border-slate-400"></div>
            ))}
          </div>

          <div className="ml-8 flex flex-col h-full relative">
            
         {/* Header & Page Number */}
            <div className="bg-amber-100/50 p-3 border-b-2 border-amber-200/60 flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <h3 className="text-amber-900 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  Day {mission?.dayNumber} • Slide {activeStep + 1}
                </h3>
                <span className="text-xs font-bold text-amber-700/80 truncate max-w-[220px]">
                  {currentChapter?.heading || "Field Notes"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleSaveNotesToCloud} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase rounded-lg shadow-sm transition flex items-center gap-1">
                  <Save size={14} /> Sync
                </button>
                <button onClick={() => setIsNotesOpen(false)} className="text-amber-900 hover:bg-amber-200 p-1 rounded-md transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* RICH TEXT TOOLBAR */}
            <div className="bg-white/60 p-2 border-b-2 border-amber-200/60 flex flex-wrap gap-1 shrink-0 items-center justify-between">
              <div className="flex gap-1 items-center">
                <button onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded font-bold transition" title="Bold"><Bold size={16}/></button>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded italic transition" title="Italic"><Italic size={16}/></button>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('underline'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded underline transition" title="Underline"><Underline size={16}/></button>
                <div className="w-px h-5 bg-slate-300 mx-1"></div>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('formatBlock', 'H1'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded transition font-black" title="Heading 1"><Heading1 size={16}/></button>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('formatBlock', 'H2'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded transition font-bold" title="Heading 2"><Heading2 size={16}/></button>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('insertUnorderedList'); }} className="p-1.5 text-slate-700 hover:bg-slate-200 rounded transition" title="Bullet List"><List size={16}/></button>
              </div>
              <div className="flex gap-1 items-center">
                <button onMouseDown={(e) => { e.preventDefault(); formatText('foreColor', '#ef4444'); }} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded transition" title="Red Text"><Type size={16}/></button>
                <button onMouseDown={(e) => { e.preventDefault(); formatText('hiliteColor', '#fef08a'); }} className="p-1.5 text-amber-500 hover:bg-amber-100 rounded transition" title="Yellow Highlight"><Highlighter size={16}/></button>
              </div>
            </div>

            {/* 🚀 FIX 4: PERFECT CSS GRID ALIGNMENT */}
            <div 
              className="flex-1 w-full bg-transparent overflow-y-auto custom-scrollbar relative"
              style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #cbd5e1 31px, #cbd5e1 32px)',
                backgroundAttachment: 'local',
                backgroundPosition: '0 0' // Forces the lines to start exactly at the top edge
              }}
            >
              <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleInput}
                onBlur={handleInput}
                // We removed `prose` and force every child element to strictly follow the 32px line height!
                className="outline-none min-h-full px-6 pt-8 pb-10 text-slate-800 text-lg leading-[32px] [&>div]:m-0 [&>div]:min-h-[32px] [&>p]:m-0 [&>p]:min-h-[32px] [&>h1]:m-0 [&>h1]:text-2xl [&>h1]:leading-[32px] [&>h1]:font-black [&>h2]:m-0 [&>h2]:text-xl [&>h2]:leading-[32px] [&>h2]:font-bold [&>ul]:m-0 [&>ul]:pl-6 [&>li]:leading-[32px] [&>li]:m-0"
              />
            </div>

            {/* Utility Footer */}
            <div className="bg-amber-100/30 p-2 flex justify-end gap-2 border-t-2 border-amber-200/60 shrink-0">
              <button onClick={handleCopy} className="p-1.5 text-slate-500 hover:text-amber-700 transition" title="Copy"><Copy size={16}/></button>
              <button onClick={handleDownload} className="p-1.5 text-slate-500 hover:text-amber-700 transition" title="Download TXT"><Download size={16}/></button>
              <button onClick={handleClear} className="p-1.5 text-slate-500 hover:text-rose-600 transition" title="Delete Page"><Trash2 size={16}/></button>
            </div>

            {/* Drag Handle Indicator */}
            <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none flex items-end justify-end p-1 opacity-30">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-amber-900"><path d="M12 0L0 12H12V0Z"/></svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}