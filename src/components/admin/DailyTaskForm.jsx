import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { extractSyllabusData, extractTextFromPPTX } from '../../services/gemini';
import { 
  Plus, Upload, Sparkles, FileUp, ClipboardPaste, 
  UploadCloud, BookOpen, Target, Gamepad2, CheckCircle2, Image as ImageIcon, Code
} from 'lucide-react';

export default function DailyTaskForm({ selectedCourse, selectedModule, dayNumber, setDayNumber, setStatusMessage, onTaskSaved }) {
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [inputMode, setInputMode] = useState('file'); 
  const [pastedTextContent, setPastedTextContent] = useState('');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [aiPayload, setAiPayload] = useState(null); 
  const [slideImages, setSlideImages] = useState({});

  // JSON Override for Quiz
  const [manualQuizJson, setManualQuizJson] = useState('');

  useEffect(() => {
    resetForm();
  }, [selectedCourse?.courseId, selectedModule?.moduleNumber]);

  const resetForm = () => {
    setTaskTitle('');
    setPdfUrl('');
    setAiPayload(null);
    setPastedTextContent('');
    setSlideImages({});
    setManualQuizJson('');
  };

  const handleImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setSlideImages(prev => ({ ...prev, [index]: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
    setStatusMessage('Saving slide to database...');
    
    try {
      const finalPayload = { ...aiPayload };
      
      // Inject Staged Images
      if (finalPayload.study_material) {
        finalPayload.study_material = finalPayload.study_material.map((slide, idx) => {
          if (slideImages[idx]) return { ...slide, image_url: slideImages[idx] };
          return slide;
        });
      }

      // INJECT MANUAL JSON QUIZ OVERRIDE
      if (manualQuizJson.trim()) {
        try {
          const parsedJson = JSON.parse(manualQuizJson);
          if (!Array.isArray(parsedJson)) throw new Error("JSON must be an array.");
          finalPayload.quizzes = parsedJson;
        } catch (err) {
          setStatusMessage(`❌ JSON Quiz Error: ${err.message}`);
          setLoading(false);
          return;
        }
      }

      const taskData = {
        courseId: selectedCourse.courseId,
        moduleNumber: selectedModule.moduleNumber,
        moduleTitle: selectedModule.title,
        dayNumber: Number(dayNumber), // Keeping DB field name same to prevent breaking existing data
        title: taskTitle.trim(),
        pdfUrl: pdfUrl.trim() || null,
        curriculumData: finalPayload, 
        createdAt: new Date().toISOString(),
        aiQuestionsStatus: 'generated'
      };

      await addDoc(collection(db, 'daily_tasks'), taskData);
      setStatusMessage(`✅ Slide ${dayNumber} successfully saved!`);
      
      resetForm();
      onTaskSaved(); 
    } catch (err) {
      setStatusMessage('Error adding task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAddDayTask} className="bg-civil-card border border-civil-border p-5 rounded-2xl space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-civil-border">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus size={16} className="text-brand-400" /> Structure Slide {dayNumber}
        </h4>
        <span className="text-[11px] text-slate-400">Step in the Module</span>
      </div>

      <div className="bg-slate-900/50 border border-brand-500/30 p-4 rounded-xl space-y-4 shadow-inner">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <label className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
            <Sparkles size={14} /> AI Slide & Game Generator
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
            {isExtracting ? 'Building Slide...' : 'Upload PDF/PPTX to Generate Slide'}
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
              <Sparkles size={14} /> {isExtracting ? 'Building Slide...' : 'Generate Slide & Games from Text'}
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
            </div>
            
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={14} className="text-rose-400" />
                <h5 className="text-xs font-bold text-slate-300">MCQs & Grand Reserve</h5>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Slide Quiz:</span>
                  <span className="font-bold text-white">{aiPayload.quizzes?.length || 0} Qs</span>
                </div>
                <div className="w-full h-px bg-slate-700"></div>
                <div className="flex justify-between">
                  <span className="text-amber-400 font-semibold">Grand Reserve:</span>
                  <span className="font-bold text-amber-400">{aiPayload.grand_exam_quizzes?.length || 0} Qs</span>
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

      {aiPayload && aiPayload.study_material?.some(slide => slide.image_request?.is_needed) && (
        <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
          <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <ImageIcon size={18} /> Art Studio: AI Image Requests
          </h4>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {aiPayload.study_material.map((slide, index) => {
              if (!slide.image_request?.is_needed) return null;
              return (
                <div key={index} className={`p-4 rounded-xl border ${slideImages[index] ? 'bg-emerald-950/10 border-emerald-500/30' : 'bg-slate-900 border-amber-500/30'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Section {index + 1}: {slide.type}</span>
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

                  {slideImages[index] && (
                    <div className="mt-4 p-2 bg-slate-950/80 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={slideImages[index]} alt="Preview" className="h-14 w-24 object-cover rounded-md border border-slate-700" />
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Ready
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

      {/* QUIZ JSON OVERRIDE - SIMPLIFIED */}
      <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl space-y-2">
        <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
          <Code size={16} /> Optional: Override Quiz (JSON)
        </h4>
        <textarea
          rows={3}
          placeholder='[{"question": "...", "options": ["A","B","C","D"], "correct_answer": "A"}]'
          value={manualQuizJson}
          onChange={(e) => setManualQuizJson(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-brand-500 transition custom-scrollbar"
        />
        <p className="text-[10px] text-slate-500">Paste JSON from Gemini Pro here to attach a highly detailed quiz to this slide, ignoring the auto-generated one.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Slide #</label>
          <input type="number" value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition" required />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-400 block mb-1">Generated Slide Title</label>
          <input type="text" placeholder="e.g. Bending Moment" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition" required />
        </div>
      </div>

      <button type="submit" disabled={loading || !aiPayload} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2">
        <Upload size={16} /> {loading ? 'Saving...' : `Save Slide ${dayNumber}`}
      </button>
    </form>
  );
}