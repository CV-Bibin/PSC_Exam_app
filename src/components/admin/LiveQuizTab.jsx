import { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Target, Clock, Loader2, Plus, Trash2, Code, Edit3, ListChecks } from 'lucide-react';

export default function LiveQuizTab() {
  const [liveTitle, setLiveTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

  // --- NEW: QUESTION MANAGEMENT STATE ---
  const [questions, setQuestions] = useState([]);
  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'bulk'
  const [bulkJson, setBulkJson] = useState('');
  
  // Manual Entry Form State
  const [currentQ, setCurrentQ] = useState({
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0, // 0=A, 1=B, 2=C, 3=D
    explanation: ''
  });

  // Handle adding a single question manually
  const handleAddManualQuestion = () => {
    if (!currentQ.question || currentQ.options.some(opt => !opt)) {
      setLiveStatus('⚠️ Please fill out the question and all 4 options.');
      return;
    }

    const formattedQuestion = {
      question: currentQ.question,
      options: currentQ.options,
      correct_answer: currentQ.options[currentQ.correctIndex],
      explanation: currentQ.explanation || 'No explanation provided.'
    };

    setQuestions([...questions, formattedQuestion]);
    setLiveStatus('✅ Question added to pool!');
    
    // Reset manual form
    setCurrentQ({
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    });
  };

  // Handle parsing bulk JSON
  const handleBulkParse = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array.");
      
      // Basic validation
      const isValid = parsed.every(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer);
      if (!isValid) throw new Error("Invalid schema format.");

      setQuestions([...questions, ...parsed]);
      setBulkJson('');
      setLiveStatus(`✅ ${parsed.length} Questions imported successfully!`);
    } catch (err) {
      setLiveStatus(`❌ Bulk Import Error: ${err.message}. Please check your JSON format.`);
    }
  };

  const removeQuestion = (indexToRemove) => {
    setQuestions(questions.filter((_, idx) => idx !== indexToRemove));
  };

  const handleScheduleLiveQuiz = async () => {
    if (!liveTitle || !startTime || !endTime) {
      setLiveStatus('⚠️ Please fill out the title and both time fields.');
      return;
    }
    if (questions.length === 0) {
      setLiveStatus('⚠️ You must add at least 1 question to the exam.');
      return;
    }

    setIsPublishingLive(true);
    setLiveStatus('Deploying Live Quiz configuration...');

    try {
      await addDoc(collection(db, 'live_quizzes'), {
        title: liveTitle,
        scheduledStartTime: new Date(startTime).toISOString(),
        scheduledEndTime: new Date(endTime).toISOString(),
        status: 'upcoming',
        maxScore: questions.length, // Score based on total questions
        questions: questions, // 🚀 INJECT THE QUESTIONS ARRAY HERE
        createdAt: serverTimestamp()
      });
      setLiveStatus('✅ Live Quiz Scheduled Successfully!');
      setLiveTitle('');
      setStartTime('');
      setEndTime('');
      setQuestions([]);
    } catch (error) {
      setLiveStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsPublishingLive(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-civil-card border border-civil-border p-6 md:p-10 rounded-3xl shadow-2xl animate-in slide-in-from-right-4 duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-400 border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.2)]">
          <Target size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Live Competitive Exam Setup</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Schedule a global synchronous exam with strict time limits.</p>
        </div>
      </div>

      {/* STEP 1: EXAM METADATA */}
      <div className="space-y-6 mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center">1</span> Exam Details
        </h3>
        
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Title</label>
          <input type="text" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="e.g. KWA Overseer Grand Mock 1" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> Start Time</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> End Time</label>
            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner [color-scheme:dark]" />
          </div>
        </div>
      </div>

      {/* STEP 2: QUESTION INJECTION */}
      <div className="space-y-6 mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center">2</span> Inject Questions
          </h3>
          
          {/* Input Mode Toggle */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            <button onClick={() => setInputMode('manual')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition ${inputMode === 'manual' ? 'bg-brand-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}>
              <Edit3 size={14}/> Manual
            </button>
            <button onClick={() => setInputMode('bulk')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition ${inputMode === 'bulk' ? 'bg-brand-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}>
              <Code size={14}/> Bulk JSON
            </button>
          </div>
        </div>

        {/* INPUT MODE: MANUAL */}
        {inputMode === 'manual' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <textarea value={currentQ.question} onChange={e => setCurrentQ({...currentQ, question: e.target.value})} placeholder="Type the question here..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner" rows={2}></textarea>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-black text-sm shrink-0">
                    {['A', 'B', 'C', 'D'][index]}
                  </div>
                  <input type="text" value={currentQ.options[index]} onChange={e => { const newOpts = [...currentQ.options]; newOpts[index] = e.target.value; setCurrentQ({...currentQ, options: newOpts}); }} placeholder={`Option ${['A', 'B', 'C', 'D'][index]}`} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none transition" />
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Correct Answer</label>
                <select value={currentQ.correctIndex} onChange={e => setCurrentQ({...currentQ, correctIndex: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm font-bold text-emerald-400 focus:border-brand-500 outline-none transition appearance-none cursor-pointer">
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>
              <div className="w-full md:w-2/3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Explanation (Optional)</label>
                <input type="text" value={currentQ.explanation} onChange={e => setCurrentQ({...currentQ, explanation: e.target.value})} placeholder="Why is this answer correct?" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-brand-500 outline-none transition" />
              </div>
            </div>

            <button onClick={handleAddManualQuestion} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-black rounded-xl border border-brand-500/30 transition flex items-center justify-center gap-2 mt-2">
              <Plus size={18} /> Add Question to Draft
            </button>
          </div>
        )}

        {/* INPUT MODE: BULK JSON */}
        {inputMode === 'bulk' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-sky-950/20 border border-sky-500/30 p-4 rounded-xl text-xs text-sky-200/70 font-mono mb-2">
              <span className="font-bold text-sky-400 block mb-1">Expected Format:</span>
              [<br/>
              &nbsp;&nbsp;{'{'}<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;"question": "What is 2+2?",<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;"options": ["3", "4", "5", "6"],<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;"correct_answer": "4",<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;"explanation": "Basic math."<br/>
              &nbsp;&nbsp;{'}'}<br/>
              ]
            </div>
            <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} placeholder="Paste JSON array here..." className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 focus:border-brand-500 outline-none transition shadow-inner custom-scrollbar"></textarea>
            <button onClick={handleBulkParse} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-2">
              <Code size={18} /> Parse & Add Bulk Questions
            </button>
          </div>
        )}

        {/* QUESTION PREVIEW LIST */}
        {questions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><ListChecks size={18} className="text-brand-400" /> Draft Questions ({questions.length})</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {questions.map((q, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-start group">
                  <div>
                    <span className="text-xs font-black text-slate-500 mr-2">Q{idx + 1}.</span>
                    <span className="text-sm font-semibold text-slate-200">{q.question}</span>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">Ans: {q.correct_answer}</div>
                  </div>
                  <button onClick={() => removeQuestion(idx)} className="text-slate-600 hover:text-rose-500 transition p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LIVE STATUS ALERTS */}
      {liveStatus && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 ${liveStatus.includes('❌') || liveStatus.includes('⚠️') ? 'bg-rose-950/30 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse'}`}>
          {liveStatus}
        </div>
      )}

      {/* STEP 3: DEPLOYMENT */}
      <button onClick={handleScheduleLiveQuiz} disabled={isPublishingLive || questions.length === 0} className="w-full py-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-black text-lg rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.3)] transition active:scale-95 flex items-center justify-center gap-3">
        {isPublishingLive ? <><Loader2 className="animate-spin" size={24} /> Securing Deployment...</> : <><Target size={24} /> Deploy Live Exam Sequence</>}
      </button>

    </div>
  );
}