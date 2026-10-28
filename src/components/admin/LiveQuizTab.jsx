import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Target, Clock, Loader2, Plus, Trash2, Code, Edit3, ListChecks, Database, Timer, Repeat, Edit, RotateCw, History, Wand2, CheckSquare, Square } from 'lucide-react';

export default function LiveQuizTab() {
  const [liveTitle, setLiveTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState('1'); 
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  
  const [editingExamId, setEditingExamId] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [inputMode, setInputMode] = useState('manual'); 
  const [bulkJson, setBulkJson] = useState('');
  const [currentQ, setCurrentQ] = useState({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
  const [deployedExams, setDeployedExams] = useState([]);

  // 🚀 Magic Generator States
  const [generatorCount, setGeneratorCount] = useState(20);
  const [selectedPastExams, setSelectedPastExams] = useState([]);
  const [weeklyMocks, setWeeklyMocks] = useState([]); 

  const fetchDeployedExams = async () => {
    try {
      const snap = await getDocs(collection(db, 'live_quizzes'));
      setDeployedExams(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.scheduledStartTime) - new Date(a.scheduledStartTime)));
      
      const mockSnap = await getDocs(collection(db, 'weekly_mocks'));
      setWeeklyMocks(mockSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error("Error fetching deployed exams:", error); }
  };

  useEffect(() => { fetchDeployedExams(); }, []);

  const handleDeleteExam = async (examId, examTitle) => {
    if (window.confirm(`CRITICAL: Purge the exam "${examTitle}"? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'live_quizzes', examId));
        fetchDeployedExams(); 
        setLiveStatus(`✅ Exam "${examTitle}" purged from database.`);
        if (editingExamId === examId) cancelEdit();
      } catch (error) { setLiveStatus(`❌ Error deleting exam: ${error.message}`); }
    }
  };

  const handleExtendDeadline = async (examId) => {
    if (window.confirm("Extend the deadline? Students' past attempts and scores WILL be saved. They cannot retake it if they already submitted.")) {
      try {
        const newHrs = prompt("Extend by how many hours?", "24");
        if (!newHrs) return;
        const exam = deployedExams.find(e => e.id === examId);
        const newEnd = new Date(new Date(exam.scheduledEndTime).getTime() + parseInt(newHrs) * 60 * 60 * 1000).toISOString();
        
        await updateDoc(doc(db, 'live_quizzes', examId), { scheduledEndTime: newEnd });
        setLiveStatus("✅ Deadline extended! History preserved.");
        fetchDeployedExams();
      } catch (error) { setLiveStatus(`❌ Failed to extend deadline: ${error.message}`); }
    }
  };

  const handleHardResetRedeploy = async (examId) => {
    if (window.confirm("HARD RESET? This wipes all student progress for this exam and gives everyone a fresh, new attempt. Proceed?")) {
      try {
        const newHrs = prompt("Enter duration in hours for the new deployment:", "24");
        if (!newHrs) return;
        const newEnd = new Date(Date.now() + parseInt(newHrs) * 60 * 60 * 1000).toISOString();
        
        await updateDoc(doc(db, 'live_quizzes', examId), {
          deployedAt: Date.now(), 
          scheduledStartTime: new Date().toISOString(),
          scheduledEndTime: newEnd
        });
        setLiveStatus("✅ Exam successfully reset and redeployed!");
        fetchDeployedExams();
      } catch (error) { setLiveStatus(`❌ Failed to reset exam: ${error.message}`); }
    }
  };

  const handleEditExam = (exam) => {
    setEditingExamId(exam.id);
    setLiveTitle(exam.title);
    
    const formatForInput = (isoString) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    
    setStartTime(formatForInput(exam.scheduledStartTime));
    setEndTime(formatForInput(exam.scheduledEndTime));
    setTimeLimit(exam.timeLimitMinutes || 15);
    setMaxAttempts(exam.maxAttempts === 'unlimited' ? 'unlimited' : (exam.maxAttempts?.toString() || '1'));
    setQuestions(exam.questions || exam.quizzes || []); 
    
    setLiveStatus(`⚠️ Editing Mode Active: "${exam.title}"`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingExamId(null); setLiveTitle(''); setStartTime(''); setEndTime(''); 
    setTimeLimit(15); setMaxAttempts('1'); setQuestions([]); setLiveStatus('');
  };

  const handleAddManualQuestion = () => {
    if (!currentQ.question || currentQ.options.some(opt => !opt)) {
      setLiveStatus('⚠️ Please fill out the question and all 4 options.'); return;
    }
    const formattedQuestion = {
      question: currentQ.question, options: currentQ.options,
      correct_answer: currentQ.options[currentQ.correctIndex],
      explanation: currentQ.explanation || 'No explanation provided.'
    };
    setQuestions([...questions, formattedQuestion]);
    setLiveStatus('✅ Question added to pool!');
    setCurrentQ({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' });
  };

  const handleBulkParse = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array.");
      const isValid = parsed.every(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer);
      if (!isValid) throw new Error("Invalid schema format.");
      setQuestions([...questions, ...parsed]);
      setBulkJson('');
      setLiveStatus(`✅ ${parsed.length} Questions imported successfully!`);
    } catch (err) { setLiveStatus(`❌ Bulk Import Error: ${err.message}. Please check your JSON format.`); }
  };

  const removeQuestion = (indexToRemove) => setQuestions(questions.filter((_, idx) => idx !== indexToRemove));

  const handleScheduleLiveQuiz = async () => {
    if (!liveTitle || !startTime || !endTime) { setLiveStatus('⚠️ Please fill out the title and both time fields.'); return; }
    if (questions.length === 0) { setLiveStatus('⚠️ You must add at least 1 question to the exam.'); return; }

    setIsPublishingLive(true);
    setLiveStatus(editingExamId ? 'Updating Deployment...' : 'Deploying Live Quiz configuration...');

    try {
      const examPayload = {
        title: liveTitle,
        scheduledStartTime: new Date(startTime).toISOString(),
        scheduledEndTime: new Date(endTime).toISOString(),
        status: 'upcoming', maxScore: questions.length, timeLimitMinutes: parseInt(timeLimit),
        maxAttempts: maxAttempts === 'unlimited' ? 'unlimited' : parseInt(maxAttempts),
        questions: questions
      };

      if (editingExamId) {
        await updateDoc(doc(db, 'live_quizzes', editingExamId), examPayload);
        setLiveStatus(`✅ Exam "${liveTitle}" Updated Successfully!`);
      } else {
        await addDoc(collection(db, 'live_quizzes'), { ...examPayload, createdAt: serverTimestamp(), deployedAt: Date.now() });
        setLiveStatus('✅ Live Quiz Scheduled Successfully!');
      }

      cancelEdit();
      fetchDeployedExams(); 
    } catch (error) { setLiveStatus(`❌ Error: ${error.message}`); } 
    finally { setIsPublishingLive(false); }
  };

  const nowIso = new Date().toISOString();
  const activeExams = deployedExams.filter(e => e.scheduledEndTime > nowIso);
  const pastExams = deployedExams.filter(e => e.scheduledEndTime <= nowIso);
  const generatorSourceExams = [...pastExams, ...weeklyMocks];

  // 🚀 Helper Function: Safely count questions regardless of schema
  const getQuestionCount = (exam) => {
    if (Array.isArray(exam.questions)) return exam.questions.length;
    if (exam.questions && typeof exam.questions === 'object') {
      return (exam.questions.mcq?.length || 0) + (exam.questions.trap?.length || 0);
    }
    if (exam.quizzes) return exam.quizzes.length;
    return 0;
  };

  const handleAutoGenerate = () => {
    if (selectedPastExams.length === 0) {
      setLiveStatus('⚠️ Select at least one past exam to pull questions from.'); return;
    }
    
    let combinedQuestions = [];
    const examsToPullFrom = generatorSourceExams.filter(e => selectedPastExams.includes(e.id));
    
    const perExamCount = Math.floor(generatorCount / examsToPullFrom.length);
    let remainder = generatorCount % examsToPullFrom.length;

    examsToPullFrom.forEach(exam => {
      // 🚀 UNIVERSAL NORMALIZER: Flattens Grand Mocks and Standard Mocks into one array
      let pool = [];
      if (Array.isArray(exam.questions)) {
        pool = [...exam.questions];
      } else if (exam.questions && typeof exam.questions === 'object') {
        pool = [
          ...(exam.questions.mcq || []).map(q => ({ ...q, gameType: 'mcq' })),
          ...(exam.questions.trap || []).map(q => {
            const isFact = q.is_true === true || String(q.correct_answer).toLowerCase().includes("fact") || String(q.correct_answer).toLowerCase().includes("true");
            return {
              ...q,
              gameType: 'trap',
              question: q.statement || q.question || "Identify if this statement is a Fact or a Trap:",
              options: ['FACT (True)', 'TRAP (False)'],
              correct_answer: isFact ? 'FACT (True)' : 'TRAP (False)',
              explanation: q.explanation || "Review this concept carefully."
            };
          })
        ];
      } else if (exam.quizzes) {
        pool = [...exam.quizzes];
      }
      
      pool.sort(() => Math.random() - 0.5);
      
      let pullCount = Math.min(perExamCount + (remainder > 0 ? 1 : 0), pool.length);
      if (remainder > 0) remainder--;

      let pulled = pool.slice(0, pullCount);
      
      pulled = pulled.map(q => {
        if (q.type === 'trap' || q.gameType === 'trap' || !q.options || q.options.length < 2) return q; 
        let newOptions = [...q.options];
        for (let i = newOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
        }
        return { ...q, options: newOptions };
      });

      combinedQuestions.push(...pulled);
    });

    combinedQuestions.sort(() => Math.random() - 0.5);

    setQuestions([...questions, ...combinedQuestions]);
    setLiveStatus(`✅ Magic Generator: Pulled and shuffled ${combinedQuestions.length} questions from ${examsToPullFrom.length} exams!`);
    setSelectedPastExams([]);
    setInputMode('manual'); 
  };

  const togglePastExamSelection = (examId) => {
    if (selectedPastExams.includes(examId)) {
      setSelectedPastExams(selectedPastExams.filter(id => id !== examId));
    } else {
      setSelectedPastExams([...selectedPastExams, examId]);
    }
  };

  const ExamAdminCard = ({ exam, isActive }) => (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between group transition ${isActive ? 'bg-slate-900 border-brand-500/30 hover:border-brand-500/60 shadow-lg' : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <h4 className={`font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{exam.title}</h4>
          <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md shrink-0 ${isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-500'}`}>
            {isActive ? 'Active' : 'Expired'}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-bold flex items-center gap-2 mb-1"><ListChecks size={14}/> {getQuestionCount(exam)} Questions</p>
        <p className="text-xs text-slate-400 font-bold flex items-center gap-2 mb-4"><Clock size={14}/> {exam.timeLimitMinutes} Mins • {exam.maxAttempts === 'unlimited' ? '∞' : exam.maxAttempts} Attempts</p>
        <div className="text-[10px] text-slate-500 font-mono mb-4 pt-4 border-t border-slate-800/50">
          Ends: {new Date(exam.scheduledEndTime).toLocaleString()}
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex gap-2">
          <button onClick={() => handleEditExam(exam)} className="flex-1 py-2 bg-sky-500/10 text-sky-400 text-xs font-bold rounded-xl hover:bg-sky-600 hover:text-white transition flex items-center justify-center gap-1.5" title="Edit Content"><Edit size={14} /> Edit</button>
          <button onClick={() => handleDeleteExam(exam.id, exam.title)} className="flex-1 py-2 bg-rose-500/10 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-600 hover:text-white transition flex items-center justify-center gap-1.5" title="Purge Exam"><Trash2 size={14} /> Purge</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExtendDeadline(exam.id)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5" title="Extend Deadline (Keep History)"><Clock size={14}/> Extend</button>
          <button onClick={() => handleHardResetRedeploy(exam.id)} className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5" title="Redeploy (Fresh Attempt)"><RotateCw size={14}/> Redeploy</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-4xl mx-auto bg-civil-card border transition-colors duration-500 p-6 md:p-10 rounded-3xl shadow-2xl animate-in slide-in-from-right-4 ${editingExamId ? 'border-sky-500/50 shadow-[0_0_50px_rgba(14,165,233,0.1)]' : 'border-civil-border'}`}>
      
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <div className={`p-4 rounded-2xl border shadow-lg ${editingExamId ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
          {editingExamId ? <Edit3 size={32} /> : <Target size={32} />}
        </div>
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">{editingExamId ? 'Edit Active Deployment' : 'Live Competitive Exam Setup'}</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">{editingExamId ? 'Modify an existing exam timeline or correct its questions.' : 'Schedule a global synchronous exam with strict time limits.'}</p>
        </div>
      </div>

      <div className="space-y-6 mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center">1</span> Exam Details
        </h3>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Exam Title</label>
          <input type="text" value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="e.g. KWA Overseer Grand Mock 1" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> Start Time</label><input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none transition shadow-inner [color-scheme:dark]" /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Clock size={14} className="inline mr-1" /> End Time</label><input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none transition shadow-inner [color-scheme:dark]" /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Timer size={14} className="inline mr-1" /> Mins</label><input type="number" min="1" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-brand-400 font-black focus:border-brand-500 outline-none transition shadow-inner" /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"><Repeat size={14} className="inline mr-1" /> Attempts</label>
            <select value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none transition appearance-none cursor-pointer shadow-inner">
              <option value="1">1 Attempt</option><option value="2">2 Attempts</option><option value="3">3 Attempts</option><option value="unlimited">Unlimited</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center">2</span> Inject Questions
          </h3>
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner overflow-x-auto">
            <button onClick={() => setInputMode('manual')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition shrink-0 ${inputMode === 'manual' ? 'bg-brand-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}><Edit3 size={14}/> Manual</button>
            <button onClick={() => setInputMode('bulk')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition shrink-0 ${inputMode === 'bulk' ? 'bg-brand-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}><Code size={14}/> Bulk JSON</button>
            <button onClick={() => setInputMode('generate')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition shrink-0 ${inputMode === 'generate' ? 'bg-brand-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}><Wand2 size={14}/> Generate</button>
          </div>
        </div>

        {inputMode === 'generate' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-sky-950/20 border border-sky-900/50 p-5 rounded-xl">
              <h4 className="text-sky-400 font-bold mb-2 flex items-center gap-2"><Wand2 size={18}/> Magic Exam Generator</h4>
              <p className="text-sm text-slate-400 mb-6">Select past exams below. The system will pull an equal number of random questions from each, shuffle all the options, and combine them into a fresh exam.</p>
              
              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-bold text-white uppercase tracking-widest shrink-0">Total Questions to Extract:</label>
                <input 
                  type="number" min="1" 
                  value={generatorCount} onChange={e => setGeneratorCount(parseInt(e.target.value))} 
                  className="w-24 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center font-black text-brand-400 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Select Expired Source Exams</p>
                {generatorSourceExams.length === 0 ? (
                  <p className="text-sm text-slate-500">No past exams available to pull from.</p>
                ) : (
                  <div className="space-y-2">
                    {generatorSourceExams.map(exam => {
                      const isSelected = selectedPastExams.includes(exam.id);
                      
                      let examTypeLabel = "Weekly Mock";
                      if (exam.isGrandMock) examTypeLabel = "Module Mastery";
                      else if (exam.scheduledEndTime) examTypeLabel = "Live Exam";

                      return (
                        <div key={exam.id} onClick={() => togglePastExamSelection(exam.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition border ${isSelected ? 'bg-sky-900/40 border-sky-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                          {isSelected ? <CheckSquare size={18} className="text-sky-400" /> : <Square size={18} className="text-slate-500" />}
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${isSelected ? 'text-sky-100' : 'text-slate-300'}`}>{exam.title}</p>
                            <p className="text-xs text-slate-500">{getQuestionCount(exam)} Questions Available</p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-950 px-2 py-1 rounded">
                            {examTypeLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button 
                onClick={handleAutoGenerate}
                disabled={selectedPastExams.length === 0}
                className="w-full mt-6 py-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              >
                <Wand2 size={18} /> Generate Mixed Exam
              </button>
            </div>
          </div>
        )}

        {inputMode === 'manual' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <textarea value={currentQ.question} onChange={e => setCurrentQ({...currentQ, question: e.target.value})} placeholder="Type the question here..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-brand-500 outline-none transition shadow-inner" rows={2}></textarea>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-black text-sm shrink-0">{['A', 'B', 'C', 'D'][index]}</div>
                  <input type="text" value={currentQ.options[index]} onChange={e => { const newOpts = [...currentQ.options]; newOpts[index] = e.target.value; setCurrentQ({...currentQ, options: newOpts}); }} placeholder={`Option ${['A', 'B', 'C', 'D'][index]}`} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-brand-500 outline-none transition" />
                </div>
              ))}
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Correct Answer</label>
                <select value={currentQ.correctIndex} onChange={e => setCurrentQ({...currentQ, correctIndex: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm font-bold text-emerald-400 focus:border-brand-500 outline-none transition appearance-none cursor-pointer">
                  <option value={0}>Option A</option><option value={1}>Option B</option><option value={2}>Option C</option><option value={3}>Option D</option>
                </select>
              </div>
              <div className="w-full md:w-2/3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Explanation (Optional)</label>
                <input type="text" value={currentQ.explanation} onChange={e => setCurrentQ({...currentQ, explanation: e.target.value})} placeholder="Why is this answer correct?" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-brand-500 outline-none transition" />
              </div>
            </div>
            <button onClick={handleAddManualQuestion} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-brand-400 font-black rounded-xl border border-brand-500/30 transition flex items-center justify-center gap-2 mt-2"><Plus size={18} /> Add Question to Draft</button>
          </div>
        )}

        {inputMode === 'bulk' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
              <span className="text-brand-400 block mb-3 text-xs font-black uppercase tracking-widest">
                Expected JSON Format Reference
              </span>
              <pre className="text-emerald-400 text-xs font-mono overflow-x-auto custom-scrollbar leading-relaxed">
{`[
  {
    "question": "What is the primary function of a tie line in chain surveying?",
    "options": ["Check accuracy", "Take offsets for details", "Avoid obstacles", "Increase stations"],
    "correct_answer": "Take offsets for details",
    "explanation": "Tie lines are run to locate interior details that are far from main survey lines."
  }
]`}
              </pre>
            </div>
            <textarea 
              value={bulkJson} 
              onChange={e => setBulkJson(e.target.value)} 
              placeholder="Paste your JSON array here..." 
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 focus:border-brand-500 outline-none transition shadow-inner custom-scrollbar"
            ></textarea>
            <button 
              onClick={handleBulkParse} 
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-2"
            >
              <Code size={18} /> Parse & Add Bulk Questions
            </button>
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><ListChecks size={18} className="text-brand-400" /> Draft Questions ({questions.length})</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {questions.map((q, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-start group">
                  <div>
                    <span className="text-xs font-black text-slate-500 mr-2">Q{idx + 1}.</span><span className="text-sm font-semibold text-slate-200">{q.question}</span>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">Ans: {q.correct_answer}</div>
                  </div>
                  <button onClick={() => removeQuestion(idx)} className="text-slate-600 hover:text-rose-500 transition p-2"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {liveStatus && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border flex items-center justify-between ${liveStatus.includes('❌') || liveStatus.includes('⚠️') ? 'bg-rose-950/30 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : liveStatus.includes('Editing Mode') ? 'bg-sky-950/30 border-sky-500/50 text-sky-400 animate-pulse' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'}`}>
          <div className="flex items-center gap-3">{liveStatus}</div>
          {editingExamId && <button onClick={cancelEdit} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition">Cancel Edit</button>}
        </div>
      )}

      <button onClick={handleScheduleLiveQuiz} disabled={isPublishingLive || questions.length === 0} className={`w-full py-5 text-white font-black text-lg rounded-2xl transition active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${editingExamId ? 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.3)]' : 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.3)]'}`}>
        {isPublishingLive ? <><Loader2 className="animate-spin" size={24} /> Securing Deployment...</> : editingExamId ? <><Edit size={24} /> Update Exam Deployment</> : <><Target size={24} /> Deploy Live Exam Sequence</>}
      </button>

      <div className="mt-12 pt-8 border-t border-slate-800">
        <h3 className="text-2xl font-black text-white flex items-center gap-2 mb-6"><Database size={24} className="text-brand-400" /> Active Deployments</h3>
        
        {activeExams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm font-bold border border-dashed border-slate-800 rounded-2xl mb-8">No active exams deployed.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {activeExams.map(exam => <ExamAdminCard key={exam.id} exam={exam} isActive={true} />)}
          </div>
        )}

        <h3 className="text-2xl font-black text-slate-400 flex items-center gap-2 mb-6"><History size={24} className="text-slate-500" /> Deployment History</h3>
        
        {pastExams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm font-bold border border-dashed border-slate-800 rounded-2xl">No past exams found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastExams.map(exam => <ExamAdminCard key={exam.id} exam={exam} isActive={false} />)}
          </div>
        )}
      </div>
    </div>
  );
}