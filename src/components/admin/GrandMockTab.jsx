import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, setDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { Award, Loader2, CheckCircle2, AlertCircle, BookOpen, Target, Settings, SlidersHorizontal, Clock } from 'lucide-react';

export default function GrandMockTab() {
  const [isCompilingGrand, setIsCompilingGrand] = useState(false);
  const [compilerGrandStatus, setCompilerGrandStatus] = useState('');
  
  const [completedTopics, setCompletedTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const [topicStats, setTopicStats] = useState({ mcqs: 0, traps: 0, loading: false });
  const [topicTasksData, setTopicTasksData] = useState([]);

  // 🚀 ADVANCED CONFIGURATION STATE
  const [examConfig, setExamConfig] = useState({
    targetMCQs: 70,
    targetTraps: 30,
    customTime: 0 // 0 means auto-calculate (1 min per question)
  });

  // 1. Fetch all courses and extract only the COMPLETED modules
  useEffect(() => {
    const fetchCompletedTopics = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        let finished = [];
        
        snap.docs.forEach(doc => {
          const courseData = doc.data();
          if (courseData.modules) {
            courseData.modules.forEach(m => {
              if (m.isCompleted) {
                finished.push({
                  courseId: courseData.courseId,
                  courseTitle: courseData.title,
                  moduleNumber: m.moduleNumber,
                  moduleTitle: m.title,
                  id: `${courseData.courseId}_${m.moduleNumber}`
                });
              }
            });
          }
        });
        
        setCompletedTopics(finished);
        if (finished.length > 0) {
          setSelectedTopic(finished[0]);
        }
      } catch (err) {
        console.error("Error fetching completed topics:", err);
      }
    };
    
    fetchCompletedTopics();
  }, []);

  // 2. Fetch specific questions when a topic is selected
  useEffect(() => {
    const fetchTopicStats = async () => {
      if (!selectedTopic) return;
      
      setTopicStats({ mcqs: 0, traps: 0, loading: true });
      setCompilerGrandStatus('');
      
      try {
        const qTasks = query(collection(db, 'daily_tasks'), where('courseId', '==', selectedTopic.courseId));
        const snap = await getDocs(qTasks);
        
        let grandMCQs = [];
        let grandTraps = [];

        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.moduleNumber === selectedTopic.moduleNumber) {
            // 🚀 UPGRADED: Prioritizes JSON uploads (special_quizzes) first!
            if (data.curriculumData?.special_quizzes?.length > 0) {
              grandMCQs.push(...data.curriculumData.special_quizzes);
            } else if (data.curriculumData?.grand_exam_quizzes?.length > 0) {
              grandMCQs.push(...data.curriculumData.grand_exam_quizzes);
            } else if (data.curriculumData?.quizzes?.length > 0) {
              grandMCQs.push(...data.curriculumData.quizzes);
            }

            if (data.curriculumData?.grand_exam_traps?.length > 0) {
              grandTraps.push(...data.curriculumData.grand_exam_traps);
            } else if (data.curriculumData?.games?.spot_the_trap?.length > 0) {
              grandTraps.push(...data.curriculumData.games.spot_the_trap);
            }
          }
        });

        setTopicTasksData({ mcqs: grandMCQs, traps: grandTraps });
        setTopicStats({ mcqs: grandMCQs.length, traps: grandTraps.length, loading: false });

        // Auto-adjust default config based on available capacity
        setExamConfig({
          targetMCQs: Math.min(70, grandMCQs.length),
          targetTraps: Math.min(30, grandTraps.length),
          customTime: 0
        });

      } catch (err) {
        console.error("Error fetching topic stats:", err);
        setTopicStats({ mcqs: 0, traps: 0, loading: false });
      }
    };

    fetchTopicStats();
  }, [selectedTopic]);

  // 3. Compile the exam with Advanced Configurations
  const handleCompileGrandMock = async () => {
    if (!selectedTopic) return;
    
    if (topicStats.mcqs === 0 && topicStats.traps === 0) {
      setCompilerGrandStatus('❌ No questions found for this topic. Add daily missions first.');
      return;
    }

    setIsCompilingGrand(true);
    setCompilerGrandStatus(`🔀 Shuffling questions for ${selectedTopic.moduleTitle}...`);

    try {
      const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

      // Slice based on Advanced Config Limits
      const selectedMCQs = shuffleArray(topicTasksData.mcqs).slice(0, examConfig.targetMCQs);
      const selectedTraps = shuffleArray(topicTasksData.traps).slice(0, examConfig.targetTraps);
      const finalTotal = selectedMCQs.length + selectedTraps.length;
      
      const timeLimit = examConfig.customTime > 0 ? examConfig.customTime : finalTotal;

      // 🚀 UPGRADED: Uses a fixed ID to overwrite previous versions instead of making messy duplicates
      const fixedMockId = `grand_mock_${selectedTopic.courseId}_mod${selectedTopic.moduleNumber}`;

      const mockPayload = {
        title: `Module Mastery: ${selectedTopic.moduleTitle}`,
        weekId: fixedMockId,
        timeLimitMinutes: timeLimit,
        createdAt: serverTimestamp(),
        questions: {
          mcq: selectedMCQs,
          trap: selectedTraps
        },
        totalQuestions: finalTotal,
        isGrandMock: true,
        targetCourse: selectedTopic.courseId,
        targetModule: selectedTopic.moduleNumber
      };

      setCompilerGrandStatus('💾 Publishing Grand Exam to database...');
      
      // Use setDoc to strictly overwrite/update
      await setDoc(doc(db, 'weekly_mocks', fixedMockId), mockPayload);
      
      setCompilerGrandStatus(`✅ Exam Published! (${finalTotal} Questions compiled). Safe to leave this tab.`);
    } catch (error) {
      setCompilerGrandStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsCompilingGrand(false);
    }
  };

  if (completedTopics.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-civil-card border border-civil-border p-12 rounded-3xl shadow-xl text-center animate-in slide-in-from-right-4 duration-300">
        <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">No Completed Topics Found</h2>
        <p className="text-slate-400">
          The Grand Subject Mock Compiler only activates for topics that are fully seeded. <br/>
          Go to the <b>Curriculum Manager</b>, select a module, and click <b>"Mark Topic Completed"</b> to unlock its exam generator here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-civil-card border border-civil-border p-8 rounded-3xl shadow-xl animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="p-3 bg-brand-500/20 rounded-xl text-brand-400"><Award size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-white">Module Mastery Compiler</h2>
          <p className="text-sm text-slate-400">Build comprehensive final exams for modules you have marked as completed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* LEFT COLUMN: Target Selection & Stats */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Target Module
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {completedTopics.map(topic => (
                <button 
                  key={topic.id} 
                  onClick={() => setSelectedTopic(topic)}
                  className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    selectedTopic?.id === topic.id 
                    ? 'bg-brand-500/10 border-brand-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-[10px] text-brand-400 font-bold mb-1">Module {topic.moduleNumber} • {topic.courseTitle}</div>
                    <div className="font-semibold text-sm line-clamp-1">{topic.moduleTitle}</div>
                  </div>
                  {selectedTopic?.id === topic.id && <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_#f59e0b]"></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden">
            {topicStats.loading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-brand-500" size={24} />
              </div>
            )}
            
            <h4 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <BookOpen size={16} className="text-brand-400" /> Database Diagnostics
            </h4>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 font-semibold">Available MCQs:</span>
              <span className={`font-bold px-3 py-1 rounded-lg ${topicStats.mcqs > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {topicStats.mcqs}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 font-semibold">Available Traps:</span>
              <span className={`font-bold px-3 py-1 rounded-lg ${topicStats.traps > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                {topicStats.traps}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Advanced Settings */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-inner">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
              <Settings size={16} className="text-sky-400"/> Advanced Configuration
            </h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Target size={14} className="text-emerald-400"/> MCQ Allocation</label>
                  <span className="text-xs font-black text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">{examConfig.targetMCQs} Max</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={topicStats.mcqs || 100} 
                  value={examConfig.targetMCQs}
                  onChange={(e) => setExamConfig({...examConfig, targetMCQs: parseInt(e.target.value)})}
                  className="w-full accent-emerald-500"
                  disabled={topicStats.mcqs === 0}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Target size={14} className="text-amber-400"/> Trap Allocation</label>
                  <span className="text-xs font-black text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">{examConfig.targetTraps} Max</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={topicStats.traps || 100} 
                  value={examConfig.targetTraps}
                  onChange={(e) => setExamConfig({...examConfig, targetTraps: parseInt(e.target.value)})}
                  className="w-full accent-amber-500"
                  disabled={topicStats.traps === 0}
                />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5"><Clock size={14} className="text-sky-400"/> Custom Time Limit (Mins)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Auto (1 min/Q)"
                    value={examConfig.customTime || ''}
                    onChange={(e) => setExamConfig({...examConfig, customTime: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-white focus:border-brand-500 outline-none"
                  />
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Leave empty for auto</span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2"><SlidersHorizontal size={14}/> Final Output</span>
              <span className="text-lg font-black text-brand-400">{examConfig.targetMCQs + examConfig.targetTraps} Qs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={handleCompileGrandMock} 
        disabled={isCompilingGrand || topicStats.loading || (topicStats.mcqs === 0 && topicStats.traps === 0) || (examConfig.targetMCQs === 0 && examConfig.targetTraps === 0)} 
        className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] transition flex items-center justify-center gap-2"
      >
        {isCompilingGrand ? (
          <><Loader2 className="animate-spin" size={20} /> Compiling Master Exam...</>
        ) : (
          <><Target size={20} /> Generate Module Mastery Exam</>
        )}
      </button>

      {/* Status Output */}
      {compilerGrandStatus && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-bold border ${compilerGrandStatus.includes('❌') ? 'bg-rose-950/30 border-rose-500/50 text-rose-400' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'}`}>
          {compilerGrandStatus}
        </div>
      )}
    </div>
  );
}