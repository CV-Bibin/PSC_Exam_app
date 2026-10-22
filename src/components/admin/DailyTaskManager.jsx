import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { extractSyllabusData, extractTextFromPPTX } from '../../services/gemini';
import { 
  Plus, Upload, Calendar, Sparkles, FileText, UploadCloud, 
  ClipboardPaste, FileUp, BookOpen, Target, Gamepad2, Eye, X, AlertTriangle, CheckCircle2,
  Image as ImageIcon // Added ImageIcon for the Art Studio UI
} from 'lucide-react';

export default function DailyTaskManager({ selectedCourse, selectedModule, setStatusMessage, globalNextDay }) {
  const [dayTasks, setDayTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Input Mode Toggle: 'file' vs 'paste'
  const [inputMode, setInputMode] = useState('file'); 
  const [pastedTextContent, setPastedTextContent] = useState('');

  // Form State
  const [dayNumber, setDayNumber] = useState(globalNextDay || 1);
  const [taskTitle, setTaskTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Holds the entire rich JSON curriculum payload from Gemini
  const [aiPayload, setAiPayload] = useState(null); 
  
  // State for the Preview Modal
  const [previewTask, setPreviewTask] = useState(null);

  // --- NEW: ART STUDIO STATE ---
  const [slideImages, setSlideImages] = useState({}); // Stores { slideIndex: 'url_or_base64' }

  // Resizes and compresses image to ensure it fits in Firestore's 1MB limit
  const handleImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Cap width to keep Base64 string small
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to 60% quality JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setSlideImages(prev => ({ ...prev, [index]: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 1. Sync the Day Number automatically when the global tracker changes
  useEffect(() => {
    if (globalNextDay) {
      setDayNumber(globalNextDay);
    }
  }, [globalNextDay]);

  // 2. Only trigger resetForm if the actual IDs change, not on parent re-renders!
  useEffect(() => {
    if (selectedCourse?.courseId && selectedModule?.moduleNumber) {
      fetchDayTasks(selectedCourse.courseId, selectedModule.moduleNumber);
      resetForm();
    }
  }, [selectedCourse?.courseId, selectedModule?.moduleNumber]);

  const resetForm = () => {
    setTaskTitle('');
    setPdfUrl('');
    setAiPayload(null);
    setPastedTextContent('');
    setSlideImages({}); // Clear staged images
  };

  const fetchDayTasks = async (courseId, moduleNum) => {
    try {
      const q = query(
        collection(db, 'daily_tasks'),
        where('courseId', '==', courseId),
        where('moduleNumber', '==', moduleNum)
      );
      const snap = await getDocs(q);
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      tasks.sort((a, b) => a.dayNumber - b.dayNumber);
      
      setDayTasks(tasks);
    } catch (err) {
      console.error("Error loading day tasks:", err);
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

  const handleAIProcessing = async (data, isText) => {
    setIsExtracting(true);
    setStatusMessage('✨ Gemini AI is designing the curriculum, quizzes, and games...');
    setAiPayload(null);

    try {
      const extractedData = await extractSyllabusData(data, isText);
      setTaskTitle(extractedData.title || 'Extracted Topic');
      setAiPayload(extractedData);
      setStatusMessage('✅ Deep-Dive Curriculum & Games Generated Successfully!');
    } catch (err) {
      setStatusMessage('❌ AI Error: ' + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAutoExtractFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfUrl(`LOCAL_FILE: ${file.name}`);
    
    if (file.name.toLowerCase().endsWith('.pptx')) {
      const rawText = await extractTextFromPPTX(file);
      await handleAIProcessing(rawText, true);
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      const base64String = await fileToBase64(file);
      await handleAIProcessing(base64String, false);
    } else {
      setStatusMessage('❌ Unsupported file type. Please upload PDF or PPTX.');
    }
    e.target.value = null;
  };

  const handleAutoExtractPaste = async () => {
    if (!pastedTextContent.trim()) {
      setStatusMessage('⚠️ Please paste some text content first.');
      return;
    }
    setPdfUrl('DIRECT_PASTE_CONTENT');
    await handleAIProcessing(pastedTextContent, true);
  };

  const handleAddDayTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !aiPayload) {
      setStatusMessage('⚠️ Please extract data using AI before saving.');
      return;
    }

    setLoading(true);
    setStatusMessage('Saving curriculum to database...');
    try {
      // --- NEW: INJECT STAGED IMAGES INTO THE PAYLOAD ---
      const finalPayload = { ...aiPayload };
      if (finalPayload.study_material) {
        finalPayload.study_material = finalPayload.study_material.map((slide, idx) => {
          if (slideImages[idx]) {
            return { ...slide, image_url: slideImages[idx] };
          }
          return slide;
        });
      }

      const taskData = {
        courseId: selectedCourse.courseId,
        moduleNumber: selectedModule.moduleNumber,
        moduleTitle: selectedModule.title,
        dayNumber: Number(dayNumber),
        title: taskTitle.trim(),
        pdfUrl: pdfUrl.trim() || null,
        curriculumData: finalPayload, // Use the updated payload with images
        createdAt: new Date().toISOString(),
        aiQuestionsStatus: 'generated'
      };

      await addDoc(collection(db, 'daily_tasks'), taskData);
      setStatusMessage(`✅ Day ${dayNumber} fully structured and scheduled!`);
      
      resetForm();
      fetchDayTasks(selectedCourse.courseId, selectedModule.moduleNumber);
    } catch (err) {
      setStatusMessage('Error adding task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Module Header */}
      <div className="bg-civil-card border border-civil-border p-5 rounded-2xl space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
              Module {selectedModule.moduleNumber} • {selectedModule.marks} Marks Weightage
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{selectedModule.title}</h3>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900/70 p-3 rounded-xl border border-slate-800 leading-relaxed">
          <div className="font-semibold text-slate-300 mb-1">Official Syllabus Scope:</div>
          <ul className="list-disc list-inside space-y-1">
            {selectedModule.subtopics?.map((sub, i) => (
              <li key={i}>{sub}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form to Add Next Day Task */}
      <form onSubmit={handleAddDayTask} className="bg-civil-card border border-civil-border p-5 rounded-2xl space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-civil-border">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus size={16} className="text-brand-400" /> Structure Day {dayNumber} Curriculum
          </h4>
          <span className="text-[11px] text-slate-400">Step in the Daily Loop</span>
        </div>

        {/* AI Input Method Selector (File vs Paste) */}
        <div className="bg-slate-900/50 border border-brand-500/30 p-4 rounded-xl space-y-4 shadow-inner">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <label className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <Sparkles size={14} /> AI Curriculum & Game Generator
            </label>
            
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full md:w-auto">
              <button type="button" onClick={() => setInputMode('file')} className={`flex-1 md:flex-none px-3 py-1 rounded-md text-xs font-semibold flex justify-center items-center gap-1.5 transition ${inputMode === 'file' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>
                <FileUp size={13} /> Upload File
              </button>
              <button type="button" onClick={() => setInputMode('paste')} className={`flex-1 md:flex-none px-3 py-1 rounded-md text-xs font-semibold flex justify-center items-center gap-1.5 transition ${inputMode === 'paste' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>
                <ClipboardPaste size={13} /> Direct Paste
              </button>
            </div>
          </div>

          {inputMode === 'file' && (
            <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed transition cursor-pointer text-sm font-bold ${isExtracting ? 'bg-slate-800 border-slate-700 text-slate-500 pointer-events-none' : 'bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/50 text-brand-400'}`}>
              <UploadCloud size={18} />
              {isExtracting ? 'Building Curriculum...' : 'Upload PDF/PPTX to Generate Material'}
              <input type="file" accept=".pdf,.pptx" className="hidden" onChange={handleAutoExtractFile} disabled={isExtracting} />
            </label>
          )}

          {inputMode === 'paste' && (
            <div className="space-y-3">
              <textarea
                rows={5}
                placeholder="Paste your raw study notes, syllabus breakdown, or question bank text here..."
                value={pastedTextContent}
                onChange={(e) => setPastedTextContent(e.target.value)}
                className="w-full bg-civil-dark border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 transition font-mono leading-relaxed"
              />
              <button type="button" onClick={handleAutoExtractPaste} disabled={isExtracting || !pastedTextContent.trim()} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50">
                <Sparkles size={14} /> {isExtracting ? 'Building Curriculum...' : 'Generate Curriculum & Games from Text'}
              </button>
            </div>
          )}

         {aiPayload && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 mt-2">
             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-between">
               <div>
                 <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5"><BookOpen size={14} className="text-brand-400" /> Deep-Dive Notes</h5>
                 <p className="text-xl font-black text-white">{aiPayload.study_material?.length || 0} <span className="text-xs font-normal text-slate-400">Chapters</span></p>
               </div>
               {aiPayload.missing_concepts?.length > 0 && (
                 <div className="mt-2 pt-2 border-t border-slate-700">
                   <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><Sparkles size={10} /> Added {aiPayload.missing_concepts.length} missing PSC concepts</span>
                 </div>
               )}
             </div>
             
             {/* UPDATED MIDDLE CARD: Daily vs Grand Exam Reserve */}
             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-between">
               <div className="flex items-center gap-1.5 mb-2">
                 <Target size={14} className="text-rose-400" />
                 <h5 className="text-xs font-bold text-slate-300">MCQs & Grand Reserve</h5>
               </div>
               <div className="space-y-1.5 text-xs">
                 <div className="flex justify-between">
                   <span className="text-slate-400">Daily Practice:</span>
                   <span className="font-bold text-white">{aiPayload.quizzes?.length || 0} Qs</span>
                 </div>
                 <div className="w-full h-px bg-slate-700"></div>
                 <div className="flex justify-between">
                   <span className="text-amber-400 font-semibold">Grand Reserve:</span>
                   <span className="font-bold text-amber-400">{aiPayload.grand_exam_quizzes?.length || 0} Qs (+{aiPayload.grand_exam_traps?.length || 0} traps)</span>
                 </div>
               </div>
             </div>

             <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
               <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5"><Gamepad2 size={14} className="text-sky-400" /> 4-Game Data Engine</h5>
               <p className="text-[11px] text-slate-400 grid grid-cols-2 gap-1 mt-2">
                 <span><strong className="text-white">{aiPayload.games?.flashcards?.length || 0}</strong> Cards</span>
                 <span><strong className="text-white">{aiPayload.games?.match_pairs?.length || 0}</strong> Matches</span>
                 <span><strong className="text-white">{aiPayload.games?.spot_the_trap?.length || 0}</strong> Traps</span>
                 <span><strong className="text-white">{aiPayload.games?.fill_in_the_blanks?.length || 0}</strong> Blanks</span>
               </p>
             </div>
           </div>
         )}
        </div>

        {/* --- ADMIN ART STUDIO (IMAGE UPLOADER) --- */}
        {aiPayload && aiPayload.study_material?.some(slide => slide.image_request?.is_needed) && (
          <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <ImageIcon size={18} /> Art Studio: AI Image Requests
            </h4>
            <p className="text-xs text-slate-400">The AI requested visual aids for the following slides. You can paste an external URL or upload a local file (it will be auto-compressed).</p>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {aiPayload.study_material.map((slide, index) => {
                if (!slide.image_request?.is_needed) return null;
                
                return (
                  <div key={index} className={`p-4 rounded-xl border ${slideImages[index] ? 'bg-emerald-950/10 border-emerald-500/30' : 'bg-slate-900 border-amber-500/30'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Slide {index + 1}: {slide.type}</span>
                        <h5 className="font-bold text-slate-200 text-sm mt-0.5">{slide.heading}</h5>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-400 border-l-2 border-amber-500 mb-4 italic">
                      "{slide.image_request.art_prompt}"
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder="Paste image URL (Imgur, Discord, etc.)"
                        value={slideImages[index]?.startsWith('http') ? slideImages[index] : ''}
                        onChange={(e) => setSlideImages(prev => ({ ...prev, [index]: e.target.value }))}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-500 outline-none"
                      />
                      <div className="text-slate-500 text-xs flex items-center justify-center font-bold px-2">OR</div>
                      <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg px-4 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-center whitespace-nowrap">
                        <UploadCloud size={14} className="mr-1.5" /> Upload File
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e.target.files[0])} />
                      </label>
                    </div>

                    {/* 🚀 NEW: VISUAL THUMBNAIL PREVIEW */}
                    {slideImages[index] && (
                      <div className="mt-4 p-2 bg-slate-950/80 border border-emerald-500/30 rounded-lg flex items-center justify-between animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <img src={slideImages[index]} alt="Preview" className="h-14 w-24 object-cover rounded-md border border-slate-700" />
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Image Ready to Save
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSlideImages(prev => { const newImgs = {...prev}; delete newImgs[index]; return newImgs; })} 
                          className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Day #</label>
            <input type="number" value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition" required />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-400 block mb-1">Generated Topic Title</label>
            <input type="text" placeholder="e.g. Bending Moment" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition" required />
          </div>
        </div>

        <button type="submit" disabled={loading || !aiPayload} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2">
          <Upload size={16} /> {loading ? 'Saving to Database...' : `Save Day ${dayNumber} Curriculum`}
        </button>
      </form>

      {/* Scheduled List with Preview Button */}
      <div className="bg-civil-card border border-civil-border p-5 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar size={16} className="text-brand-400" /> Scheduled Daily Flow ({dayTasks.length} Days)
        </h4>

        {dayTasks.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No daily tasks configured for this module yet.</p>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {dayTasks.map((t) => (
              <div key={t.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs transition hover:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold text-[10px]">Day {t.dayNumber}</span>
                    <span className="font-semibold text-white">{t.title}</span>
                  </div>
                  {t.curriculumData && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Gamepad2 size={10} className="text-sky-400" /> 
                      {t.curriculumData.quizzes?.length} MCQs | {t.curriculumData.games?.flashcards?.length} Flashcards
                    </span>
                  )}
                </div>
                
                {t.curriculumData && (
                  <button 
                    onClick={() => setPreviewTask(t)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold text-[10px] rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Eye size={12} /> View Curriculum
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- PREVIEW MODAL OVERLAY --- */}
      {previewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-civil-card border border-civil-border rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800">
              <div>
                <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold text-[10px] uppercase tracking-wider mb-1 inline-block">
                  Day {previewTask.dayNumber} Data Preview
                </span>
                <h3 className="text-xl font-black text-white">{previewTask.title}</h3>
              </div>
              <button onClick={() => setPreviewTask(null)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-civil-dark/50">
              
              {/* 1. Study Material Notes */}
              <section className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <BookOpen size={16} className="text-brand-400" /> Deep-Dive Notes
                </h4>
                {previewTask.curriculumData?.study_material?.map((mat, i) => (
                  <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h5 className="font-bold text-amber-400 mb-2">{mat.heading}</h5>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">{mat.content}</div>
                  </div>
                ))}
              </section>

              {/* 2. Quizzes / MCQs */}
              <section className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Target size={16} className="text-rose-400" /> Generated MCQs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewTask.curriculumData?.quizzes?.map((quiz, i) => (
                    <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-sm">
                      <p className="font-semibold text-white mb-2">Q{i+1}: {quiz.question}</p>
                      <ul className="space-y-1 mb-3">
                        {quiz.options?.map((opt, j) => (
                          <li key={j} className={`p-1.5 rounded text-xs ${opt === quiz.correct_answer ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
                            {opt}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-400"><span className="text-brand-400 font-bold">Explanation:</span> {quiz.explanation}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. Game Data - Flashcards & Traps */}
              <section className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Gamepad2 size={16} className="text-sky-400" /> Game Engine Data
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Flashcards */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase">Flashcards ({previewTask.curriculumData?.games?.flashcards?.length})</h5>
                    {previewTask.curriculumData?.games?.flashcards?.slice(0,3).map((card, i) => (
                      <div key={i} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs flex flex-col gap-1">
                        <span className="text-brand-300 font-bold">{card.front}</span>
                        <span className="text-slate-400">{card.back}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500 italic">+ {Math.max(0, (previewTask.curriculumData?.games?.flashcards?.length || 0) - 3)} more cards hidden</p>
                  </div>

                  {/* Spot the Trap */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase">Spot the Trap Statements ({previewTask.curriculumData?.games?.spot_the_trap?.length})</h5>
                    {previewTask.curriculumData?.games?.spot_the_trap?.slice(0,3).map((trap, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border text-xs flex gap-2 ${trap.is_true ? 'bg-emerald-900/20 border-emerald-900/50' : 'bg-rose-900/20 border-rose-900/50'}`}>
                        <div className="mt-0.5">{trap.is_true ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-rose-500" />}</div>
                        <div>
                          <p className="text-slate-300 font-medium mb-1">"{trap.statement}"</p>
                          <p className="text-[10px] text-slate-400">{trap.catch}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}