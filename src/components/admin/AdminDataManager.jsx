import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { Database, Users, Trash2, Edit3, AlertTriangle, X, Target, Save, Clock, BarChart3, Search, Award, Settings, BookOpen, ShieldAlert, Radio } from 'lucide-react';

export default function AdminDataManager() {
  const [activeTab, setActiveTab] = useState('tasks');
  
  const [courses, setCourses] = useState([]); 
  const [tasks, setTasks] = useState([]);
  const [exams, setExams] = useState([]);
  const [liveExams, setLiveExams] = useState([]);
  const [results, setResults] = useState([]);
  
  const [studentStats, setStudentStats] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [editModal, setEditModal] = useState({ isOpen: false, item: null, collectionName: '' });
  const [saveStatus, setSaveStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Syllabus Courses
      const courseSnap = await getDocs(collection(db, 'courses'));
      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Daily Missions
      const taskSnap = await getDocs(query(collection(db, 'daily_tasks'), orderBy('dayNumber', 'asc')));
      setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Weekly/Grand Mocks
      const examSnap = await getDocs(query(collection(db, 'weekly_mocks'), orderBy('createdAt', 'desc')));
      setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch Live Quizzes
      const liveSnap = await getDocs(query(collection(db, 'live_quizzes'), orderBy('scheduledStartTime', 'desc')));
      setLiveExams(liveSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 🚀 THE FIX: Fetch from the 'users' collection first!
      const usersSnap = await getDocs(collection(db, 'users'));
      const userAggregates = {};
      
      usersSnap.docs.forEach(doc => {
        const userData = doc.data();
        const email = userData.email || 'Unknown';
        // Initialize EVERY registered user on the dashboard, even with 0 scores
        userAggregates[email] = {
          email: email,
          examsTaken: 0,
          totalScore: 0,
          totalQuestions: 0,
          lastActive: userData.createdAt || null, 
          history: [],
          ...userData 
        };
      });

      // Fetch Results & Merge them into the users
      const resultSnap = await getDocs(query(collection(db, 'exam_results'), orderBy('submittedAt', 'desc')));
      const rawResults = resultSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResults(rawResults);

      rawResults.forEach(res => {
        const email = res.email || 'Anonymous Student';
        
        // Failsafe: If a student took an exam but isn't in 'users' somehow, add them
        if (!userAggregates[email]) {
          userAggregates[email] = {
            email: email,
            examsTaken: 0,
            totalScore: 0,
            totalQuestions: 0,
            lastActive: res.submittedAt,
            history: []
          };
        }
        
        userAggregates[email].examsTaken += 1;
        userAggregates[email].totalScore += (res.score || 0);
        userAggregates[email].totalQuestions += (res.totalQuestions || 0);
        
        // Update last active date based on their most recent exam
        if (!userAggregates[email].lastActive || (res.submittedAt && res.submittedAt > userAggregates[email].lastActive)) {
          userAggregates[email].lastActive = res.submittedAt;
        }
        
        userAggregates[email].history.push(res);
      });

      // Calculate overall accuracy
      const statsArray = Object.values(userAggregates).map(student => ({
        ...student,
        accuracy: student.totalQuestions > 0 ? Math.round((student.totalScore / student.totalQuestions) * 100) : 0
      }));

      // Sort by total score (Leaderboard style)
      statsArray.sort((a, b) => b.totalScore - a.totalScore);
      setStudentStats(statsArray);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerDelete = (collectionName, id, title) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you absolutely sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await deleteDoc(doc(db, collectionName, id));
          fetchData(); 
        } catch (error) {
          alert("Error deleting: " + error.message);
        }
      }
    });
  };

  const triggerBatchDelete = (collectionName, warningMsg) => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ CRITICAL WARNING',
      message: warningMsg,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          const snap = await getDocs(collection(db, collectionName));
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          fetchData();
          alert(`Successfully purged ${collectionName}.`);
        } catch (error) {
          alert("Error executing purge: " + error.message);
        }
      }
    });
  };

  const handleOpenEdit = (item, collectionName) => {
    setEditModal({ isOpen: true, item: JSON.parse(JSON.stringify(item)), collectionName });
    setSaveStatus('');
  };

  const handleUpdateAnswer = (questionIndex, newAnswer, type = 'mcq') => {
    const updatedItem = { ...editModal.item };
    
    if (editModal.collectionName === 'daily_tasks') {
      if (type === 'special_quizzes') updatedItem.curriculumData.special_quizzes[questionIndex].correct_answer = newAnswer;
      if (type === 'quizzes') updatedItem.curriculumData.quizzes[questionIndex].correct_answer = newAnswer;
    } else {
      if (updatedItem.questions[type]) {
        updatedItem.questions[type][questionIndex].correct_answer = newAnswer;
        if (type === 'trap') updatedItem.questions[type][questionIndex].is_true = (newAnswer === 'true');
      }
    }
    
    setEditModal({ ...editModal, item: updatedItem });
  };

  const handleSaveEdits = async () => {
    setSaveStatus('Saving...');
    try {
      const docRef = doc(db, editModal.collectionName, editModal.item.id);
      
      if (editModal.collectionName === 'daily_tasks') {
        await updateDoc(docRef, { curriculumData: editModal.item.curriculumData });
      } else {
        await updateDoc(docRef, { questions: editModal.item.questions });
      }
      
      setSaveStatus('✅ Changes Saved!');
      fetchData();
      setTimeout(() => setEditModal({ isOpen: false, item: null, collectionName: '' }), 1500);
    } catch (error) {
      setSaveStatus('❌ Error saving: ' + error.message);
    }
  };

  const filteredStudents = studentStats.filter(s => s.email.toLowerCase().includes(searchQuery.toLowerCase()));

  // 🚀 Safe Date Formatter
  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Recent';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString();
    return 'Recent';
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      <div className="flex gap-3 border-b border-slate-800 pb-4 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('tasks')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'tasks' ? 'bg-brand-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          <Database size={18}/> Daily Missions
        </button>
        <button onClick={() => setActiveTab('exams')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'exams' ? 'bg-brand-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          <Target size={18}/> Global Exams
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-brand-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          <Users size={18}/> User Progress
        </button>
        <button onClick={() => setActiveTab('advanced')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'advanced' ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-900 text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/30'}`}>
          <Settings size={18}/> Master Controls
        </button>
      </div>

      {/* --- TAB 1: DAILY TASKS --- */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2"><Database className="text-brand-400"/> Manage Daily Curriculums</h3>
              <p className="text-xs text-slate-400 mt-1">Review, edit quizzes, or delete daily deployments.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {tasks.map(task => (
              <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 font-bold text-[10px] rounded">Day {task.dayNumber}</span>
                    <span className="text-sm font-bold text-slate-200">{task.title}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {task.curriculumData?.study_material?.length || 0} Slides • {task.curriculumData?.quizzes?.length || 0} MCQs
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(task, 'daily_tasks')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 font-bold text-[11px] uppercase tracking-widest rounded-lg transition flex items-center gap-1.5"
                  >
                    <Edit3 size={14} /> Edit Quizzes
                  </button>
                  <button 
                    onClick={() => triggerDelete('daily_tasks', task.id, `Day ${task.dayNumber}: ${task.title}`)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No tasks generated yet.</div>}
          </div>
        </div>
      )}

      {/* --- TAB 2: EXAMS (MOCKS & LIVE) --- */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {liveExams.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-rose-500/30 bg-rose-950/10">
                <h3 className="font-bold text-white flex items-center gap-2"><Radio className="text-rose-400 animate-pulse"/> Live Arena Competitions</h3>
              </div>
              <div className="divide-y divide-slate-800/50">
                {liveExams.map(exam => (
                  <div key={exam.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 font-bold text-[10px] rounded bg-rose-500/20 text-rose-400">LIVE EXAM</span>
                        <span className="text-sm font-bold text-slate-200">{exam.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEdit(exam, 'live_quizzes')} className="px-3 py-1.5 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 font-bold text-[11px] uppercase tracking-widest rounded-lg transition flex items-center gap-1.5">
                        <Edit3 size={14} /> Quick Edit
                      </button>
                      <button onClick={() => triggerDelete('live_quizzes', exam.id, exam.title)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50">
              <h3 className="font-bold text-white flex items-center gap-2"><Target className="text-sky-400"/> Manage Mocks & Grand Exams</h3>
            </div>
            <div className="divide-y divide-slate-800/50 max-h-[500px] overflow-y-auto custom-scrollbar">
              {exams.map(exam => (
                <div key={exam.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 font-bold text-[10px] rounded ${exam.isGrandMock ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {exam.isGrandMock ? 'GRAND MOCK' : 'WEEKLY MOCK'}
                      </span>
                      <span className="text-sm font-bold text-slate-200">{exam.title}</span>
                    </div>
                    <div className="text-xs text-slate-500">{exam.totalQuestions || 0} Questions • {exam.timeLimitMinutes} Mins</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEdit(exam, 'weekly_mocks')} className="px-3 py-1.5 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 font-bold text-[11px] uppercase tracking-widest rounded-lg transition flex items-center gap-1.5">
                      <Edit3 size={14} /> Quick Edit
                    </button>
                    <button onClick={() => triggerDelete('weekly_mocks', exam.id, exam.title)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: USER PROGRESS TRACKER --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by student email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pl-12 pr-4 py-3 focus:border-brand-500 outline-none transition shadow-inner"
              />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-6 py-2 rounded-xl flex items-center gap-4 shadow-md">
              <Users className="text-brand-400" size={20} />
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Registered Students</p>
                <p className="text-lg font-black text-white leading-none mt-1">{studentStats.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500">
                    <th className="p-4">Student Identification</th>
                    <th className="p-4">Exams Taken</th>
                    <th className="p-4">Total Score</th>
                    <th className="p-4">Global Accuracy</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">No students found.</td></tr>
                  ) : (
                    filteredStudents.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition group">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm flex items-center gap-2">
                            {idx === 0 && student.totalScore > 0 && <Award size={16} className="text-amber-400" title="Top Performer" />}
                            {student.email}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-1">Last Active: {formatLastActive(student.lastActive)}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-300 font-mono font-bold text-xs">{student.examsTaken}</span>
                        </td>
                        <td className="p-4 font-black text-brand-400">{student.totalScore} pts</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={14} className={student.accuracy >= 80 ? 'text-emerald-500' : student.accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'} />
                            <span className="font-bold text-slate-300 text-sm">{student.accuracy}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedStudent(student)}
                            className="px-4 py-2 bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: ADVANCED MASTER CONTROLS --- */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50">
              <h3 className="font-bold text-white flex items-center gap-2"><BookOpen className="text-sky-400"/> Syllabus & Course Management</h3>
              <p className="text-xs text-slate-400 mt-1">Manage core curricula structures seeded into the database.</p>
            </div>
            <div className="divide-y divide-slate-800/50">
              {courses.map(course => (
                <div key={course.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition">
                  <div>
                    <h4 className="font-bold text-slate-200 text-lg">{course.title || course.id}</h4>
                    <p className="text-xs text-slate-500 mt-1">{course.modules?.length || 0} Modules Registered • {course.totalMarks || 0} Total Marks</p>
                  </div>
                  <button 
                    onClick={() => triggerDelete('courses', course.id, course.title || course.id)}
                    className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 rounded-lg text-xs font-bold transition border border-transparent flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Remove Course
                  </button>
                </div>
              ))}
              {courses.length === 0 && <div className="p-8 text-center text-slate-500 font-bold">No courses seeded in the database.</div>}
            </div>
          </div>

          <div className="bg-rose-950/10 border border-rose-900/30 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-rose-900/30 bg-rose-950/20">
              <h3 className="font-bold text-rose-400 flex items-center gap-2"><ShieldAlert /> System Danger Zone</h3>
              <p className="text-xs text-rose-500/70 mt-1">Critical database wipe functions. Use with extreme caution.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => triggerBatchDelete('exam_results', 'This will instantly wipe ALL student leaderboard data, exam results, and analytics history across the entire platform. PROCEED?')}
                className="p-5 bg-slate-900 border border-rose-900/50 rounded-xl hover:bg-rose-950/40 transition text-left group"
              >
                <h4 className="font-black text-rose-400 mb-1 group-hover:text-rose-300">Wipe All Leaderboards & Results</h4>
                <p className="text-xs text-slate-500">Purges the `exam_results` collection completely.</p>
              </button>
              
              <button 
                onClick={() => triggerBatchDelete('daily_tasks', 'This will wipe EVERY single daily mission, syllabus curriculum, and AI-generated quiz from the platform. PROCEED?')}
                className="p-5 bg-slate-900 border border-rose-900/50 rounded-xl hover:bg-rose-950/40 transition text-left group"
              >
                <h4 className="font-black text-rose-400 mb-1 group-hover:text-rose-300">Wipe All Daily Curriculum Missions</h4>
                <p className="text-xs text-slate-500">Purges the `daily_tasks` collection completely.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* STUDENT PROFILE MODAL                       */}
      {/* ========================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-civil-card border border-civil-border rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-2xl font-black text-white">{selectedStudent.email}</h3>
                <div className="flex gap-4 mt-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">Total Score: <span className="text-brand-400">{selectedStudent.totalScore}</span></span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">Avg Accuracy: <span className={selectedStudent.accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{selectedStudent.accuracy}%</span></span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-950/50">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={16}/> Exam History</h4>
              
              {selectedStudent.history.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-bold">This student has not submitted any exams yet.</div>
              ) : (
                selectedStudent.history.map((res, i) => {
                  const date = formatLastActive(res.submittedAt);
                  const pct = Math.round((res.score / res.totalQuestions) * 100);
                  return (
                    <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{res.examType || 'Assessment'}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">{date}</p>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score</p>
                          <p className="font-black text-white">{res.score}/{res.totalQuestions}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg border text-xs font-black ${pct >= 80 ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' : pct >= 50 ? 'bg-amber-950/30 border-amber-500/50 text-amber-400' : 'bg-rose-950/30 border-rose-500/50 text-rose-400'}`}>
                          {pct}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* UNIVERSAL EXAM EDIT MODAL                   */}
      {/* ========================================= */}
      {editModal.isOpen && editModal.item && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-civil-card border border-civil-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Edit3 className="text-brand-400" size={18}/> Quick Edit: {editModal.item.title}
              </h3>
              <button onClick={() => setEditModal({ isOpen: false, item: null, collectionName: '' })} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/50">
              {editModal.collectionName === 'daily_tasks' && (
                <>
                  {['quizzes', 'special_quizzes'].map(quizType => (
                    editModal.item.curriculumData?.[quizType]?.length > 0 && (
                      <div key={quizType} className="space-y-4">
                        <h4 className="text-sm font-black text-brand-400 uppercase tracking-widest">{quizType.replace('_', ' ')}</h4>
                        {editModal.item.curriculumData[quizType].map((q, idx) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <p className="font-semibold text-white text-sm mb-3">Q{idx + 1}: {q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options?.map((opt, oIdx) => (
                                <button
                                  key={oIdx}
                                  onClick={() => handleUpdateAnswer(idx, opt, quizType)}
                                  className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${opt === q.correct_answer ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </>
              )}

              {['weekly_mocks', 'live_quizzes'].includes(editModal.collectionName) && editModal.item.questions && (
                <>
                  {editModal.item.questions.mcq?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-brand-400 uppercase tracking-widest flex items-center gap-2"><Database size={16}/> MCQs</h4>
                      {editModal.item.questions.mcq.map((q, idx) => (
                        <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <p className="font-semibold text-white text-sm mb-3">Q{idx + 1}: {q.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => handleUpdateAnswer(idx, opt, 'mcq')}
                                className={`p-2 rounded-lg text-xs font-semibold text-left transition border ${opt === q.correct_answer ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-inner' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {editModal.item.questions.trap?.length > 0 && (
                    <div className="space-y-4 mt-8">
                      <h4 className="text-sm font-black text-rose-400 uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={16}/> Spot the Trap</h4>
                      {editModal.item.questions.trap.map((q, idx) => (
                        <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <p className="font-semibold text-white text-sm mb-3">"{q.statement}"</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateAnswer(idx, 'true', 'trap')} className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${q.is_true ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Fact (True)</button>
                            <button onClick={() => handleUpdateAnswer(idx, 'false', 'trap')} className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${!q.is_true ? 'bg-rose-950/30 border-rose-500/50 text-rose-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Trap (False)</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
              <span className={`text-sm font-bold ${saveStatus.includes('Error') ? 'text-rose-500' : 'text-emerald-400'}`}>{saveStatus}</span>
              <div className="flex gap-3">
                <button onClick={() => setEditModal({ isOpen: false, item: null, collectionName: '' })} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm transition">Cancel</button>
                <button onClick={handleSaveEdits} className="px-6 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2"><Save size={16}/> Save Updates</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* UNIVERSAL CONFIRMATION MODAL (Deletions)  */}
      {/* ========================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full shrink-0"><AlertTriangle size={24} /></div>
              <h3 className="text-xl font-bold text-white leading-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal({ isOpen: false })} className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-sm rounded-xl transition">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2"><Trash2 size={16}/> Confirm Action</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}