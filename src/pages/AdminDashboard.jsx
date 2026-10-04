import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { STANDARD_COURSES } from '../data/standardSyllabus';
import { Layers, Database, BookOpen } from 'lucide-react';
import DailyTaskManager from '../components/admin/DailyTaskManager';

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'courses'));
      const list = snap.docs.map(d => d.data());
      setCourses(list);
      
      // Auto-select the first course and module if available
      if (list.length > 0 && !selectedCourse) {
        setSelectedCourse(list[0]);
        if (list[0].modules?.length > 0) {
          setSelectedModule(list[0].modules[0]);
        }
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    }
  };

  // One-Click Seed standard syllabus to Firestore
  const handleSeedStandardSyllabi = async () => {
    setLoading(true);
    setStatusMessage('Writing KSHB AE and Overseer syllabi into Firestore...');
    try {
      for (const course of STANDARD_COURSES) {
        await setDoc(doc(db, 'courses', course.courseId), course);
      }
      setStatusMessage('✅ Standard syllabi seeded successfully!');
      fetchCourses();
    } catch (err) {
      setStatusMessage('❌ Failed to seed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-civil-card border border-civil-border p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Layers className="text-brand-400" /> Syllabus & Curriculum Control
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure KSHB AE & Overseer modules, schedule Day-by-Day topics, and attach syllabus PDFs.
          </p>
        </div>

        {/* Quick Seed Button */}
        <button
          onClick={handleSeedStandardSyllabi}
          disabled={loading}
          className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center gap-2 transition whitespace-nowrap"
        >
          <Database size={16} /> Seed Standard Syllabi
        </button>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div className={`p-4 text-sm font-semibold rounded-xl border ${
          statusMessage.includes('❌') 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {statusMessage}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Select Course & Modules */}
        <div className="space-y-4">
          <div className="bg-civil-card border border-civil-border p-4 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <BookOpen size={16} className="text-brand-400" /> Select Exam / Course
            </h3>
            
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  key={course.courseId}
                  onClick={() => {
                    setSelectedCourse(course);
                    if (course.modules?.length > 0) setSelectedModule(course.modules[0]);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedCourse?.courseId === course.courseId
                      ? 'bg-brand-500/15 border-brand-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div>{course.title}</div>
                  <div className="text-[10px] text-brand-400 mt-1">
                    {course.totalMarks} Marks • {course.modules?.length || 0} Modules
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Module Selector List */}
          {selectedCourse && (
            <div className="bg-civil-card border border-civil-border p-4 rounded-2xl space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-300 mb-3 sticky top-0 bg-civil-card pb-2">
                Modules ({selectedCourse.modules?.length || 0})
              </h3>
              {selectedCourse.modules?.map((m) => (
                <button
                  key={m.moduleNumber}
                  onClick={() => setSelectedModule(m)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                    selectedModule?.moduleNumber === m.moduleNumber
                      ? 'bg-slate-800 border-brand-400 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-brand-400 font-bold">Module {m.moduleNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                      {m.marks} Marks
                    </span>
                  </div>
                  <div className="text-slate-200 line-clamp-2 leading-relaxed">{m.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center & Right Column: Passes State to the split child component */}
        <div className="lg:col-span-2">
          {selectedModule ? (
            <DailyTaskManager 
              selectedCourse={selectedCourse} 
              selectedModule={selectedModule} 
              setStatusMessage={setStatusMessage} 
            />
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