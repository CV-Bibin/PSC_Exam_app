import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { 
  Database, Users, Trash2, Edit3, AlertTriangle, X, Target, Save, Clock, Trophy
} from 'lucide-react';

export default function AdminDataManager() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'exams' | 'users'
  
  const [tasks, setTasks] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [editExamModal, setEditExamModal] = useState({ isOpen: false, exam: null });
  const [saveStatus, setSaveStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tasks
      const taskSnap = await getDocs(query(collection(db, 'daily_tasks'), orderBy('dayNumber', 'asc')));
      setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Exams
      const examSnap = await getDocs(query(collection(db, 'weekly_mocks'), orderBy('createdAt', 'desc')));
      setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch User Results
      const resultSnap = await getDocs(query(collection(db, 'exam_results'), orderBy('submittedAt', 'desc')));
      setResults(resultSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- DELETE LOGIC WITH CUSTOM ALERT ---
  const triggerDelete = (collectionName, id, title) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you absolutely sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await deleteDoc(doc(db, collectionName, id));
          fetchData(); // Refresh UI
        } catch (error) {
          alert("Error deleting: " + error.message);
        }
      }
    });
  };

  // --- EDIT EXAM LOGIC ---
  const handleOpenEdit = (exam) => {
    // Deep clone to avoid mutating state directly before save
    setEditExamModal({ isOpen: true, exam: JSON.parse(JSON.stringify(exam)) });
    setSaveStatus('');
  };

  const handleUpdateAnswer = (questionIndex, newAnswer, type = 'mcq') => {
    const updatedExam = { ...editExamModal.exam };
    updatedExam.questions[type][questionIndex].correct_answer = newAnswer;
    
    // For traps, we map correct_answer to is_true
    if (type === 'trap') {
      updatedExam.questions[type][questionIndex].is_true = (newAnswer === 'true');
    }
    
    setEditExamModal({ ...editExamModal, exam: updatedExam });
  };

  const handleSaveExamEdits = async () => {
    setSaveStatus('Saving...');
    try {
      const examRef = doc(db, 'weekly_mocks', editExamModal.exam.id);
      await updateDoc(examRef, { questions: editExamModal.exam.questions });
      setSaveStatus('✅ Changes Saved!');
      fetchData();
      setTimeout(() => setEditExamModal({ isOpen: false, exam: null }), 1500);
    } catch (error) {
      setSaveStatus('❌ Error saving: ' + error.message);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Sub-Navigation */}
      <div className="flex gap-3 border-b border-slate-800 pb-4">
        <button onClick={() => setActiveTab('tasks')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-brand-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>
          <Database size={18}/> Daily Missions
        </button>
        <button onClick={() => setActiveTab('exams')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'exams' ? 'bg-brand-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>
          <Target size={18}/> Global Exams
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'users' ? 'bg-brand-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'}`}>
          <Users size={18}/> User Progress
        </button>
      </div>

      {/* --- TAB 1: DAILY TASKS --- */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2"><Database className="text-brand-400"/> Manage Daily Curriculums</h3>
            <p className="text-xs text-slate-400 mt-1">Delete a day to regenerate it from the Curriculum Manager.</p>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 font-bold text-[10px] rounded">Day {task.dayNumber}</span>
                    <span className="text-sm font-bold text-slate-200">{task.title}</span>
                  </div>
                  <div className="text-xs text-slate-500">{task.moduleTitle || 'Unknown Module'}</div>
                </div>
                <button 
                  onClick={() => triggerDelete('daily_tasks', task.id, `Day ${task.dayNumber}: ${task.title}`)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete Day"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {tasks.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No tasks generated yet.</div>}
          </div>
        </div>
      )}

      {/* --- TAB 2: EXAMS (EDIT / DELETE) --- */}
      {activeTab === 'exams' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2"><Target className="text-brand-400"/> Manage Mocks & Grand Exams</h3>
            <p className="text-xs text-slate-400 mt-1">Edit answer keys or completely remove published exams.</p>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {exams.map(exam => (
              <div key={exam.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${exam.isGrandMock ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {exam.isGrandMock ? 'GRAND MOCK' : 'WEEKLY MOCK'}
                    </span>
                    <span className="text-sm font-bold text-slate-200">{exam.title}</span>
                  </div>
                  <div className="text-xs text-slate-500">{exam.totalQuestions} Questions • {exam.timeLimitMinutes} Mins</div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(exam)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Quick Edit
                  </button>
                  <button 
                    onClick={() => triggerDelete('weekly_mocks', exam.id, exam.title)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {exams.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No exams compiled yet.</div>}
          </div>
        </div>
      )}

      {/* --- TAB 3: USER PROGRESS TRACKER --- */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2"><Users className="text-brand-400"/> User Performance Logs</h3>
            <p className="text-xs text-slate-400 mt-1">Real-time submissions from students completing global exams.</p>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {results.map(res => {
              const date = res.submittedAt?.toDate ? res.submittedAt.toDate().toLocaleString() : 'Just now';
              const percentage = Math.round((res.score / res.totalQuestions) * 100);
              
              return (
                <div key={res.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/50 transition">
                  <div>
                    <div className="font-bold text-slate-200 text-sm mb-0.5">{res.email || 'Anonymous Student'}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Clock size={12}/> {date} • <span className="text-brand-400 font-semibold">{res.examType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Score</div>
                      <div className="text-sm font-black text-white">{res.score}/{res.totalQuestions}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Accuracy</div>
                      <div className={`text-sm font-black ${percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{percentage}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {results.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No exam submissions yet.</div>}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* CUSTOM CONFIRMATION MODAL (Matching UI)     */}
      {/* ========================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({ isOpen: false })} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition">
                  Cancel
                </button>
                <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* EDIT EXAM MODAL (Quick Correct Answers)     */}
      {/* ========================================= */}
      {editExamModal.isOpen && editExamModal.exam && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-civil-card border border-civil-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2"><Edit3 className="text-brand-400"/> Edit Exam Answer Key</h3>
                <p className="text-xs text-slate-400 mt-1">{editExamModal.exam.title}</p>
              </div>
              <button onClick={() => setEditExamModal({ isOpen: false, exam: null })} className="p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Questions Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Edit MCQs */}
              {editExamModal.exam.questions?.mcq?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-rose-400 border-b border-slate-800 pb-2 flex items-center gap-2"><Target size={16}/> Multiple Choice Questions</h4>
                  {editExamModal.exam.questions.mcq.map((q, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <p className="text-sm font-bold text-white mb-3">Q{idx + 1}. {q.question}</p>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Correct Answer</label>
                        <select 
                          value={q.correct_answer} 
                          onChange={(e) => handleUpdateAnswer(idx, e.target.value, 'mcq')}
                          className="bg-slate-950 border border-slate-700 text-emerald-400 text-sm font-semibold rounded-lg p-3 outline-none focus:border-brand-500 transition cursor-pointer"
                        >
                          {q.options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit Traps */}
              {editExamModal.exam.questions?.trap?.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-2 flex items-center gap-2"><AlertTriangle size={16}/> Spot The Trap (True/False)</h4>
                  {editExamModal.exam.questions.trap.map((q, idx) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <p className="text-sm font-bold text-white mb-3">"{q.statement}"</p>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Is this a Fact or Trap?</label>
                        <select 
                          value={q.is_true ? 'true' : 'false'} 
                          onChange={(e) => handleUpdateAnswer(idx, e.target.value, 'trap')}
                          className={`border text-sm font-semibold rounded-lg p-3 outline-none focus:border-brand-500 transition cursor-pointer ${q.is_true ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/30 border-rose-500/50 text-rose-400'}`}
                        >
                          <option value="true">FACT (True)</option>
                          <option value="false">TRAP (False)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Footer Save */}
            <div className="p-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className={`text-sm font-bold ${saveStatus.includes('❌') ? 'text-rose-400' : 'text-emerald-400'}`}>{saveStatus}</span>
              <button onClick={handleSaveExamEdits} className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-950 font-black rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Save size={18} /> Save Answer Key
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}