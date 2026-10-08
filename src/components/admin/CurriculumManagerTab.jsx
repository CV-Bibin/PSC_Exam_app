import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, setDoc, getDocs, addDoc, query, orderBy, limit, where, serverTimestamp } from 'firebase/firestore';
import { STANDARD_COURSES } from '../../data/standardSyllabus';
import { Database, BookOpen, CheckCircle2, Lock, Unlock, AlertCircle } from 'lucide-react';
import DailyTaskManager from './DailyTaskManager';

export default function CurriculumManagerTab() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [globalNextDay, setGlobalNextDay] = useState(1);
  const [moduleTaskCount, setModuleTaskCount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse) localStorage.setItem('admin_last_course', selectedCourse.courseId);
    if (selectedModule) localStorage.setItem('admin_last_module', selectedModule.moduleNumber.toString());
    fetchModuleTaskCount();
  }, [selectedCourse, selectedModule]);

  useEffect(() => {
    if (statusMessage.includes('✅')) {
      fetchInitialData();
      fetchModuleTaskCount();
    }
  }, [statusMessage]);

  const fetchInitialData = async () => {
    try {
      const taskQ = query(collection(db, 'daily_tasks'), orderBy('dayNumber', 'desc'), limit(1));
      const taskSnap = await getDocs(taskQ);
      setGlobalNextDay(!taskSnap.empty ? taskSnap.docs[0].data().dayNumber + 1 : 1);

      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(d => d.data());
      setCourses(list);
      
      if (list.length > 0 && !selectedCourse) {
        const lastCourseId = localStorage.getItem('admin_last_course');
        const lastModuleNum = parseInt(localStorage.getItem('admin_last_module'), 10);
        const targetCourse = list.find(c => c.courseId === lastCourseId) || list[0];
        setSelectedCourse(targetCourse);
        if (targetCourse.modules?.length > 0) {
          setSelectedModule(targetCourse.modules.find(m => m.moduleNumber === lastModuleNum) || targetCourse.modules[0]);
        }
      }
    } catch (err) {
      console.error("Error loading curriculum data:", err);
    }
  };

  const fetchModuleTaskCount = async () => {
    if (!selectedModule || !selectedCourse) return;
    try {
      const q = query(collection(db, 'daily_tasks'), where('courseId', '==', selectedCourse.courseId));
      const snap = await getDocs(q);
      const count = snap.docs.filter(d => d.data().moduleNumber === selectedModule.moduleNumber).length;
      setModuleTaskCount(count);
    } catch (err) {
      console.error("Error counting tasks:", err);
    }
  };

  const handleSeedStandardSyllabi = async () => {
    setLoading(true);
    setStatusMessage('Writing KSHB AE and Overseer syllabi into Firestore...');
    try {
      for (const course of STANDARD_COURSES) {
        await setDoc(doc(db, 'courses', course.courseId), course);
      }
      setStatusMessage('✅ Standard syllabi seeded successfully!');
      fetchInitialData();
    } catch (err) {
      setStatusMessage('❌ Failed to seed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- AUTOMATIC GRAND EXAM COMPILER ---
 const handleToggleTopicCompletion = async () => {
    if (!selectedCourse || !selectedModule) return;
    setLoading(true);
    
    const newStatus = !selectedModule.isCompleted;
    
    try {
      const courseRef = doc(db, 'courses', selectedCourse.courseId);
      const updatedModules = selectedCourse.modules.map(m => 
        m.moduleNumber === selectedModule.moduleNumber ? { ...m, isCompleted: newStatus } : m
      );
      const updatedCourse = { ...selectedCourse, modules: updatedModules };
      
      await setDoc(courseRef, updatedCourse);
      setSelectedCourse(updatedCourse);
      setSelectedModule({ ...selectedModule, isCompleted: newStatus });
      setCourses(courses.map(c => c.courseId === updatedCourse.courseId ? updatedCourse : c));
      
      if (newStatus === true) {
        setStatusMessage(`⏳ Compiling Grand Exam for ${selectedModule.title}...`);
        
        const qTasks = query(collection(db, 'daily_tasks'), where('courseId', '==', selectedCourse.courseId));
        const snap = await getDocs(qTasks);
        
        let grandMCQs = [];
        let grandTraps = [];

        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.moduleNumber === selectedModule.moduleNumber) {
            if (data.curriculumData?.grand_exam_quizzes) grandMCQs.push(...data.curriculumData.grand_exam_quizzes);
            if (data.curriculumData?.grand_exam_traps) grandTraps.push(...data.curriculumData.grand_exam_traps);
          }
        });

        if (grandMCQs.length === 0 && grandTraps.length === 0) {
          snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.moduleNumber === selectedModule.moduleNumber) {
              if (data.curriculumData?.quizzes) grandMCQs.push(...data.curriculumData.quizzes);
              if (data.curriculumData?.games?.spot_the_trap) grandTraps.push(...data.curriculumData.games.spot_the_trap);
            }
          });
        }

        const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

        // FIXED ID: Overwrites previous versions instead of making duplicates
        const fixedMockId = `grand_mock_${selectedCourse.courseId}_mod${selectedModule.moduleNumber}`;

        const mockPayload = {
          title: `Grand Subject Exam: ${selectedModule.title}`,
          weekId: fixedMockId,
          timeLimitMinutes: 60,
          createdAt: serverTimestamp(),
          questions: {
            mcq: shuffleArray(grandMCQs).slice(0, 60), 
            trap: shuffleArray(grandTraps).slice(0, 40)
          },
          totalQuestions: Math.min(grandMCQs.length, 60) + Math.min(grandTraps.length, 40),
          isGrandMock: true
        };

        if (mockPayload.totalQuestions > 0) {
          // Changed from addDoc to setDoc using the fixed Mock ID
          await setDoc(doc(db, 'weekly_mocks', fixedMockId), mockPayload);
          setStatusMessage(`✅ ${selectedModule.title} Locked! Grand Exam Updated (${mockPayload.totalQuestions} Questions).`);
        } else {
          setStatusMessage(`✅ ${selectedModule.title} Locked! (No questions found to compile)`);
        }
      } else {
        setStatusMessage(`🔓 ${selectedModule.title} Unlocked for editing.`);
      }

    } catch (error) {
      setStatusMessage('❌ Error updating topic status: ' + error.message);
    } finally {
      setLoading(false);
      fetchInitialData(); 
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      <div className="flex justify-end">
        <button onClick={handleSeedStandardSyllabi} disabled={loading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition whitespace-nowrap">
          <Database size={14} /> Seed Standard Syllabi
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 text-sm font-semibold rounded-xl border ${statusMessage.includes('❌') || statusMessage.includes('⚠️') ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL */}
        <div className="space-y-4">
          <div className="bg-civil-card border border-civil-border p-4 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><BookOpen size={16} className="text-brand-400" /> Select Exam / Course</h3>
            <div className="space-y-2">
              {courses.map((course) => (
                <button key={course.courseId} onClick={() => { setSelectedCourse(course); if (course.modules?.length > 0) setSelectedModule(course.modules[0]); }} className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition ${selectedCourse?.courseId === course.courseId ? 'bg-brand-500/15 border-brand-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <div>{course.title}</div>
                  <div className="text-[10px] text-brand-400 mt-1">{course.totalMarks} Marks • {course.modules?.length || 0} Modules</div>
                </button>
              ))}
            </div>
          </div>

          {selectedCourse && (
            <div className="bg-civil-card border border-civil-border p-4 rounded-2xl space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-300 mb-3 sticky top-0 bg-civil-card pb-2">Modules ({selectedCourse.modules?.length || 0})</h3>
              {selectedCourse.modules?.map((m) => (
                <button key={m.moduleNumber} onClick={() => setSelectedModule(m)} className={`w-full text-left p-3 rounded-xl border text-xs transition ${selectedModule?.moduleNumber === m.moduleNumber ? 'bg-slate-800 border-brand-400 text-white font-bold' : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-brand-400 font-bold flex items-center gap-1">
                      {m.isCompleted && <Lock size={12} className="text-rose-400" />}
                      Module {m.moduleNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700">{m.marks} Marks</span>
                  </div>
                  <div className={`line-clamp-2 leading-relaxed ${m.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{m.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {selectedModule ? (
            <>
              {/* STATUS BAR WITH SMALL TOGGLE BUTTON */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md transition-colors ${selectedModule.isCompleted ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-700'}`}>
                <div>
                  <h3 className={`font-bold text-base mb-1 ${selectedModule.isCompleted ? 'text-slate-500' : 'text-white'}`}>{selectedModule.title}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-md font-bold uppercase tracking-wider text-[10px]">
                      Global Timeline
                    </span>
                    <span className="text-slate-400 font-medium text-xs">Up next: <b className="text-amber-400">Day {globalNextDay}</b></span>
                    
                    {!selectedModule.isCompleted && (
                      <span className="text-slate-500 text-xs border-l border-slate-700 pl-3">
                        Tasks Added: <b className={moduleTaskCount >= 2 ? "text-emerald-400" : "text-amber-400"}>{moduleTaskCount}</b>
                      </span>
                    )}
                  </div>
                </div>

                {/* SMALL TOGGLE BUTTON LOGIC */}
                {!selectedModule.isCompleted ? (
                  moduleTaskCount >= 2 ? (
                    <button 
                      onClick={handleToggleTopicCompletion}
                      disabled={loading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CheckCircle2 size={14} /> Mark Completed
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-800 bg-slate-950/50 rounded-lg text-slate-400 text-xs font-semibold">
                      <AlertCircle size={14} className="text-amber-500" />
                      Add {2 - moduleTaskCount} more day(s) to lock
                    </div>
                  )
                ) : (
                  <button 
                    onClick={handleToggleTopicCompletion}
                    disabled={loading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-600 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Unlock size={14} /> Unlock
                  </button>
                )}
              </div>

              {!selectedModule.isCompleted ? (
                <DailyTaskManager 
                  selectedCourse={selectedCourse} 
                  selectedModule={selectedModule} 
                  setStatusMessage={setStatusMessage}
                  globalNextDay={globalNextDay} 
                />
              ) : (
                <div className="bg-slate-950 border border-slate-800 p-12 rounded-2xl text-center flex flex-col items-center">
                  <Lock size={40} className="text-slate-600 mb-4" />
                  <h4 className="text-slate-300 font-bold text-lg">Topic Locked</h4>
                  <p className="text-slate-500 text-sm mt-2">This syllabus module is marked as complete. A Grand Subject Exam was automatically generated. Select a new module from the left to continue to Day {globalNextDay}.</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-civil-card border border-civil-border p-12 rounded-2xl text-center text-slate-400 text-sm">
              Please select a course and module on the left to manage daily syllabus tasks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}