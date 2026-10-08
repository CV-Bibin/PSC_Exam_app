import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { Award, BrainCircuit, Loader2, CheckCircle2, AlertCircle, BookOpen, Target } from 'lucide-react';

export default function GrandMockTab() {
  const [isCompilingGrand, setIsCompilingGrand] = useState(false);
  const [compilerGrandStatus, setCompilerGrandStatus] = useState('');
  
  const [completedTopics, setCompletedTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const [topicStats, setTopicStats] = useState({ mcqs: 0, traps: 0, loading: false });
  const [topicTasksData, setTopicTasksData] = useState([]);

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

  // 2. When a completed topic is selected, fetch its specific questions
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
            // Pull from dedicated Grand Exam reserve, fallback to regular quizzes if missing
            if (data.curriculumData?.grand_exam_quizzes?.length > 0) {
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

      } catch (err) {
        console.error("Error fetching topic stats:", err);
        setTopicStats({ mcqs: 0, traps: 0, loading: false });
      }
    };

    fetchTopicStats();
  }, [selectedTopic]);

  // 3. Compile the exam for the specific topic
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

      // Mix and cap questions (e.g., max 60 MCQs, 40 Traps = 100 max total)
      const selectedMCQs = shuffleArray(topicTasksData.mcqs).slice(0, 60);
      const selectedTraps = shuffleArray(topicTasksData.traps).slice(0, 40);

      const mockPayload = {
        title: `Grand Subject Exam: ${selectedTopic.moduleTitle}`,
        weekId: `grand_${selectedTopic.id}_${Date.now()}`,
        timeLimitMinutes: selectedMCQs.length + selectedTraps.length, // 1 min per question
        createdAt: serverTimestamp(),
        questions: {
          mcq: selectedMCQs,
          trap: selectedTraps
        },
        totalQuestions: selectedMCQs.length + selectedTraps.length,
        isGrandMock: true, // Tag to differentiate from weekly mocks
        targetCourse: selectedTopic.courseId,
        targetModule: selectedTopic.moduleNumber
      };

      setCompilerGrandStatus('💾 Publishing Grand Exam to database...');
      await addDoc(collection(db, 'weekly_mocks'), mockPayload);
      
      setCompilerGrandStatus(`✅ Grand Exam Published! (${mockPayload.totalQuestions} Questions compiled from ${selectedTopic.moduleTitle}). Students will see this in their exam arena.`);
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
    <div className="max-w-3xl mx-auto bg-civil-card border border-civil-border p-8 rounded-3xl shadow-xl animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
        <div className="p-3 bg-brand-500/20 rounded-xl text-brand-400"><Award size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-white">Grand Subject Exam Compiler</h2>
          <p className="text-sm text-slate-400">Build comprehensive final exams for modules you have marked as completed.</p>
        </div>
      </div>

      {/* Target Topic Selection */}
      <div className="mb-6 space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" /> Select Completed Topic
        </label>
        <div className="grid grid-cols-1 gap-2">
          {completedTopics.map(topic => (
            <button 
              key={topic.id} 
              onClick={() => setSelectedTopic(topic)}
              className={`text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                selectedTopic?.id === topic.id 
                ? 'bg-brand-500/10 border-brand-500 text-white' 
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

      {/* Available Data Stats */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 mb-8 relative overflow-hidden">
        {topicStats.loading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        )}
        
        <h4 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
          <BookOpen size={16} className="text-brand-400" /> Topic Diagnostics
        </h4>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400 font-semibold">Available Grand MCQs:</span>
          <span className={`font-bold px-3 py-1 rounded-lg ${topicStats.mcqs > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            {topicStats.mcqs} Questions
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400 font-semibold">Available Grand Traps:</span>
          <span className={`font-bold px-3 py-1 rounded-lg ${topicStats.traps > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
            {topicStats.traps} Statements
          </span>
        </div>

        <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-800">
          <span className="text-slate-400 font-semibold">Total Exam Capacity:</span>
          <span className="font-black text-white bg-slate-800 px-3 py-1 rounded-lg">
            {topicStats.mcqs + topicStats.traps} Questions
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={handleCompileGrandMock} 
        disabled={isCompilingGrand || topicStats.loading || (topicStats.mcqs === 0 && topicStats.traps === 0)} 
        className="w-full py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] transition flex items-center justify-center gap-2"
      >
        {isCompilingGrand ? (
          <><Loader2 className="animate-spin" size={20} /> Compiling Topic Exam...</>
        ) : (
          <><Target size={20} /> Generate Grand Exam for this Topic</>
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