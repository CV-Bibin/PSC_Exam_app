import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { extractSyllabusData, extractTextFromPPTX } from '../../services/gemini';
import { 
  Plus, 
  Upload, 
  Calendar, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  Clock,
  ClipboardPaste,
  FileUp
} from 'lucide-react';

export default function DailyTaskManager({ selectedCourse, selectedModule, setStatusMessage }) {
  const [dayTasks, setDayTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Input Mode Toggle: 'file' vs 'paste'
  const [inputMode, setInputMode] = useState('file'); 
  const [pastedTextContent, setPastedTextContent] = useState('');

  // Form State
  const [dayNumber, setDayNumber] = useState(1);
  const [taskTitle, setTaskTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [keyNotes, setKeyNotes] = useState('');
  
  // AI Validation State
  const [aiInsights, setAiInsights] = useState(null); 

  useEffect(() => {
    if (selectedCourse && selectedModule) {
      fetchDayTasks(selectedCourse.courseId, selectedModule.moduleNumber);
      setTaskTitle('');
      setPdfUrl('');
      setKeyNotes('');
      setAiInsights(null);
      setPastedTextContent('');
    }
  }, [selectedCourse, selectedModule]);

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
      setDayNumber(tasks.length + 1);
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

  // AI Extraction for File Upload (PDF / PPTX)
  const handleAutoExtractFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    setStatusMessage('✨ Gemini AI is analyzing the document and fact-checking...');
    setAiInsights(null);

    try {
      let aiData;
      
      if (file.name.toLowerCase().endsWith('.pptx')) {
        const rawText = await extractTextFromPPTX(file);
        aiData = await extractSyllabusData(rawText, true);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        const base64String = await fileToBase64(file);
        aiData = await extractSyllabusData(base64String, false);
      } else {
        throw new Error("Unsupported file type. Please upload PDF or PPTX.");
      }
      
      setTaskTitle(aiData.title);
      setKeyNotes(aiData.notes);
      setPdfUrl(`LOCAL_FILE: ${file.name}`);
      
      setAiInsights({
        dates: aiData.dates_found || [],
        validity: aiData.validity_check || "No validity check provided."
      });
      
      setStatusMessage('✅ Analysis & Fact-Check Complete!');
    } catch (err) {
      setStatusMessage('❌ AI Error: ' + err.message);
    } finally {
      setIsExtracting(false);
      e.target.value = null;
    }
  };

  // AI Extraction for Direct Pasted Text
  const handleAutoExtractPaste = async () => {
    if (!pastedTextContent.trim()) {
      setStatusMessage('⚠️ Please paste some text content first.');
      return;
    }

    setIsExtracting(true);
    setStatusMessage('✨ Gemini AI is analyzing your pasted notes and fact-checking...');
    setAiInsights(null);

    try {
      // Send raw text to Gemini
      const aiData = await extractSyllabusData(pastedTextContent, true);
      
      setTaskTitle(aiData.title);
      setKeyNotes(aiData.notes);
      setPdfUrl('DIRECT_PASTE_CONTENT');
      
      setAiInsights({
        dates: aiData.dates_found || [],
        validity: aiData.validity_check || "No validity check provided."
      });
      
      setStatusMessage('✅ Pasted Text Analysis & Fact-Check Complete!');
    } catch (err) {
      setStatusMessage('❌ AI Error: ' + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddDayTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setLoading(true);
    setStatusMessage('');
    try {
      const taskData = {
        courseId: selectedCourse.courseId,
        moduleNumber: selectedModule.moduleNumber,
        moduleTitle: selectedModule.title,
        dayNumber: Number(dayNumber),
        title: taskTitle.trim(),
        pdfUrl: pdfUrl.trim() || null,
        keyNotes: keyNotes.trim() || null,
        createdAt: new Date().toISOString(),
        aiQuestionsStatus: 'pending' 
      };

      await addDoc(collection(db, 'daily_tasks'), taskData);
      setStatusMessage(`Day ${dayNumber} successfully added to ${selectedModule.title}!`);
      
      setTaskTitle('');
      setPdfUrl('');
      setKeyNotes('');
      setAiInsights(null);
      setPastedTextContent('');
      fetchDayTasks(selectedCourse.courseId, selectedModule.moduleNumber);
    } catch (err) {
      setStatusMessage('Error adding task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Module Header */}
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
            <Plus size={16} className="text-brand-400" /> Schedule Day {dayNumber} for this Module
          </h4>
          <span className="text-[11px] text-slate-400">Step in the Daily Loop</span>
        </div>

        {/* AI Input Method Selector (File vs Paste) */}
        <div className="bg-slate-900/50 border border-brand-500/30 p-4 rounded-xl space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
              <Sparkles size={14} /> AI Auto-Extraction & Validation
            </label>
            
            {/* Toggle Buttons */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  inputMode === 'file' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileUp size={13} /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  inputMode === 'paste' ? 'bg-brand-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardPaste size={13} /> Direct Text Paste
              </button>
            </div>
          </div>

          {/* Mode 1: File Upload */}
          {inputMode === 'file' && (
            <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed transition cursor-pointer text-sm font-bold
              ${isExtracting ? 'bg-slate-800 border-slate-700 text-slate-500 pointer-events-none' : 'bg-brand-500/10 hover:bg-brand-500/20 border-brand-500/50 text-brand-400'}`}>
              <UploadCloud size={18} />
              {isExtracting ? 'Processing File...' : 'Upload PDF or PPTX to Auto-Fill & Fact-Check'}
              <input 
                type="file" 
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" 
                className="hidden" 
                onChange={handleAutoExtractFile}
                disabled={isExtracting}
              />
            </label>
          )}

          {/* Mode 2: Direct Text Paste */}
          {inputMode === 'paste' && (
            <div className="space-y-3">
              <textarea
                rows={5}
                placeholder="Paste your raw study notes, syllabus breakdown, or question bank text here..."
                value={pastedTextContent}
                onChange={(e) => setPastedTextContent(e.target.value)}
                className="w-full bg-civil-dark border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 transition font-mono leading-relaxed"
              />
              <button
                type="button"
                onClick={handleAutoExtractPaste}
                disabled={isExtracting || !pastedTextContent.trim()}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={14} /> {isExtracting ? 'Analyzing Pasted Notes...' : 'Process Pasted Text with AI & Fact-Check'}
              </button>
            </div>
          )}

          {/* Display AI Insights if available */}
          {aiInsights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800 mt-2">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Clock size={12} className="text-sky-400" /> Extracted Dates/IS Codes
                </h5>
                {aiInsights.dates.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {aiInsights.dates.map((date, i) => (
                      <span key={i} className="px-2 py-0.5 bg-sky-500/10 text-sky-300 text-[10px] rounded border border-sky-500/20">
                        {date}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">No dates or specific years found.</p>
                )}
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" /> AI Validity Check
                </h5>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {aiInsights.validity}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Day #</label>
            <input
              type="number"
              value={dayNumber}
              onChange={(e) => setDayNumber(e.target.value)}
              className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-400 block mb-1">Day Topic Title</label>
            <input
              type="text"
              placeholder="e.g. Bending Moment & Shear Force in Overhanging Beams"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
            <FileText size={14} className="text-brand-400" /> Source File / Storage Reference
          </label>
          <input
            type="text"
            placeholder="https://... or Direct Text Paste"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Refined High-Yield Notes for AI</label>
          <textarea
            rows={4}
            placeholder="Key formulas, IS Code numbers, or concepts the AI must test the student on..."
            value={keyNotes}
            onChange={(e) => setKeyNotes(e.target.value)}
            className="w-full bg-civil-dark border border-civil-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
        >
          <Upload size={16} /> {loading ? 'Saving...' : `Add Day ${dayNumber} Task & Lock to Syllabus`}
        </button>
      </form>

      {/* List of Existing Scheduled Days for this Module */}
      <div className="bg-civil-card border border-civil-border p-5 rounded-2xl space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar size={16} className="text-brand-400" /> Scheduled Daily Flow ({dayTasks.length} Days)
        </h4>

        {dayTasks.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No daily tasks configured for this module yet. Add Day 1 above.
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {dayTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-bold text-[10px]">
                      Day {t.dayNumber}
                    </span>
                    <span className="font-semibold text-white">{t.title}</span>
                  </div>
                  {t.pdfUrl && (
                    <span className="text-[11px] text-slate-400 block truncate max-w-[200px] sm:max-w-xs">
                      Ref: {t.pdfUrl}
                    </span>
                  )}
                </div>

                <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700 flex items-center gap-1 shrink-0">
                  <Sparkles size={12} className="text-brand-400" /> AI Ready
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}