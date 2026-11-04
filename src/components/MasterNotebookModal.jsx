import { useState } from 'react';
import { Book, X, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MasterNotebookModal({ isOpen, onClose }) {
  const { profile } = useAuth();
  const [selectedDay, setSelectedDay] = useState(null);

  if (!isOpen) return null;

  // Extract and sort all days that have notes saved
  const slideNotes = profile?.slideNotes || {};
  const availableDays = Object.keys(slideNotes).map(Number).sort((a, b) => a - b);

  // Default to the first available day if none is selected
  const activeDay = selectedDay || (availableDays.length > 0 ? availableDays[0] : null);
  const activeDayNotes = activeDay ? slideNotes[activeDay] : {};
  const availableSlides = Object.keys(activeDayNotes).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#faf9f6] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 border-2 border-amber-900/30">
        
        {/* LEFT SIDEBAR: Table of Contents */}
        <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h2 className="text-xl font-black text-amber-400 flex items-center gap-3 tracking-widest uppercase">
              <BookOpen size={24} /> Master Notes
            </h2>
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Table of Contents</p>
            {availableDays.length === 0 ? (
              <p className="text-slate-500 italic px-2">No notes recorded yet.</p>
            ) : (
              availableDays.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-3 ${activeDay === day ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}`}
                >
                  <Layers size={18} /> Day {day} Protocol
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT SIDE: The Notebook Pages */}
        <div className="flex-1 flex flex-col relative bg-[#faf9f6]">
          <div className="absolute right-4 top-4 z-10 hidden md:block">
            <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition shadow-sm">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 relative"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #cbd5e1 31px, #cbd5e1 32px)',
              backgroundAttachment: 'local',
              backgroundPosition: '0 0'
            }}
          >
            {availableSlides.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <Book size={64} className="mb-4" />
                <h3 className="text-2xl font-black">Book is Empty</h3>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-16 pb-20">
                <div className="text-center mb-12 bg-[#faf9f6] inline-block pr-8">
                  <h1 className="text-4xl font-black text-amber-900 border-b-4 border-amber-500 pb-2 inline-block">Day {activeDay} Notes</h1>
                </div>

                {availableSlides.map(slideIndex => {
                  const htmlContent = activeDayNotes[slideIndex];
                  if (!htmlContent || htmlContent.trim() === '') return null;
                  
                  return (
                    <div key={slideIndex} className="relative">
                      {/* Slide Badge */}
                      <div className="absolute -left-4 md:-left-12 top-2 bg-amber-200 text-amber-900 text-xs font-black px-2 py-1 rounded shadow-sm border border-amber-300 uppercase tracking-widest transform -rotate-2">
                        Slide {slideIndex + 1}
                      </div>
                      
                      {/* Rendered Rich Text */}
                      <div 
                        className="text-slate-800 text-lg leading-[32px] [&>div]:m-0 [&>div]:min-h-[32px] [&>p]:m-0 [&>p]:min-h-[32px] [&>h1]:m-0 [&>h1]:text-2xl [&>h1]:leading-[32px] [&>h1]:font-black [&>h1]:text-amber-900 [&>h2]:m-0 [&>h2]:text-xl [&>h2]:leading-[32px] [&>h2]:font-bold [&>h2]:text-amber-800 [&>ul]:m-0 [&>ul]:pl-6 [&>li]:leading-[32px] [&>li]:m-0"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}