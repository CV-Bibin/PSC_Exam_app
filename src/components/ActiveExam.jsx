import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Target, ShieldAlert, Clock, Database, Play, AlertTriangle } from 'lucide-react';
import GameEngine from './GameEngine'; 


export default function ActiveExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  
  // 🚀 Catch the shuffled payload from React Router memory
  const { state } = useLocation(); 
  // 🚀 Pull cloud history to check attempts
  const { globalScores } = useAuth();
  
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBriefing, setIsBriefing] = useState(true);

  const trueExamId = id?.startsWith('dynamic_') ? id.replace('dynamic_', '') : id;
  const isReviewUrl = searchParams.get('mode') === 'review';

  useEffect(() => {
    const fetchExam = async () => {
      try {
        if (id.startsWith('dynamic_')) {
          // 🚀 Read directly from memory state instead of local storage
          if (state?.examPayload) setExamData(state.examPayload);
          setLoading(false);
          return; 
        }

        let docRef = doc(db, 'live_quizzes', id); 
        let snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          docRef = doc(db, 'weekly_mocks', id);
          snap = await getDoc(docRef);
        }
        
        if (snap.exists()) {
          const rawData = snap.data();
          let flatQuestions = [];
          
          if (Array.isArray(rawData.questions)) {
            flatQuestions = rawData.questions;
          } else if (rawData.questions && typeof rawData.questions === 'object') {
            flatQuestions = [
              ...(rawData.questions.mcq || []).map(q => ({ ...q, gameType: 'mcq' })),
              ...(rawData.questions.trap || []).map(q => {
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
          }

          rawData.questions = flatQuestions;
          setExamData(rawData);
        }
      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    
    if (id) fetchExam();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] space-y-8">
        <div className="relative flex justify-center items-center w-32 h-32">
          <div className="absolute inset-0 border-4 border-brand-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <div className="absolute inset-2 border-4 border-t-brand-500 border-r-brand-500 border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
          <div className="absolute inset-6 border-4 border-b-sky-500 border-l-sky-500 border-t-transparent border-r-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
          <Target size={40} className="text-brand-400 animate-pulse relative z-10" />
        </div>
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">Initializing Assessment Environment</h2>
          <p className="text-sm text-brand-400 font-mono mt-3 animate-pulse">Decrypting secure payload & compiling questions...</p>
        </div>
      </div>
    );
  }

  if (!examData || !examData.questions || examData.questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center space-y-4">
        <AlertTriangle size={64} className="text-rose-500" />
        <h2 className="text-3xl font-black text-white">Assessment Unavailable</h2>
        <p className="text-slate-400 max-w-md">This exam payload is empty, expired, or has been removed by the administrator.</p>
        <button onClick={() => navigate('/arena')} className="mt-4 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition">Return to Arena</button>
      </div>
    );
  }

 // 🚀 Count attempts by finding how many times this exam ID appears in their cloud history
  const attemptsMade = (globalScores || []).filter(score => score.examId === trueExamId).length;
  const maxAllowed = examData?.maxAttempts === 'unlimited' ? Infinity : parseInt(examData?.maxAttempts || 1);
  const isExhausted = attemptsMade >= maxAllowed;
  const forceReview = isExhausted || isReviewUrl;

  const isNegativeMarkingApplicable = examData.isGrandMock || trueExamId.includes('monthly') || trueExamId.includes('live') || trueExamId.includes('grand');

  if (isBriefing && !forceReview && (examData.isGrandMock || trueExamId.includes('monthly') || trueExamId.includes('grand') || trueExamId.includes('live'))) {
    const mcqCount = examData.questions.filter(q => q.gameType === 'mcq').length;
    const trapCount = examData.questions.filter(q => q.gameType === 'trap').length;

    return (
      <div className="max-w-5xl mx-auto mt-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 border border-brand-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.1)] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>
          
          <div className="p-10 text-center border-b border-slate-800 bg-slate-950/50">
            <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldAlert size={40} className="text-brand-400" />
            </div>
            <span className="inline-block px-4 py-1 mb-4 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-xs uppercase tracking-widest shadow-sm">
              High-Stakes Assessment
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{examData.title}</h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">You are about to initiate a strict, timed assessment. Ensure you have a stable connection and zero distractions before proceeding.</p>
          </div>

          <div className={`p-10 grid grid-cols-1 md:grid-cols-${isNegativeMarkingApplicable ? '4' : '3'} gap-6`}>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
              <Clock size={32} className="text-sky-400 mb-3" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Limit</span>
              <span className="text-xl font-black text-white">{examData.timeLimitMinutes} Minutes</span>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
              <Database size={32} className="text-emerald-400 mb-3" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payload</span>
              <span className="text-xl font-black text-white">{examData.totalQuestions} Questions</span>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
              <Target size={32} className="text-amber-400 mb-3" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Composition</span>
              <span className="text-sm font-bold text-slate-300">{mcqCount} MCQs<br/>{trapCount} Traps</span>
            </div>
            {isNegativeMarkingApplicable && (
              <div className="bg-rose-950/20 p-6 rounded-2xl border border-rose-900/50 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-rose-500/5 animate-pulse"></div>
                <AlertTriangle size={32} className="text-rose-500 mb-3 relative z-10" />
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 relative z-10">Negative Marking</span>
                <span className="text-xl font-black text-rose-300 relative z-10">-0.33</span>
                <span className="text-[10px] font-bold text-rose-400/70 mt-1 uppercase tracking-widest relative z-10">Per Wrong Answer</span>
              </div>
            )}
          </div>

          <div className="p-10 pt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-rose-400 font-bold bg-rose-500/10 px-4 py-2 rounded-lg mb-8 border border-rose-500/20">
              <AlertTriangle size={16} /> Leaving the window will automatically submit your current score.
            </div>
            <button 
              onClick={() => setIsBriefing(false)} 
              className="w-full md:w-auto px-12 py-5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xl rounded-2xl transition shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto"
            >
              <Play fill="currentColor" size={24} /> COMMENCE ASSESSMENT
            </button>
          </div>
        </div>
      </div>
    );
  }

 // 🚀 FIX: Extract the day number from the exam ID so Firebase registers the slide completion
  const dayMatch = trueExamId.match(/^daily_(\d+)$/);
  const extractedDayNumber = dayMatch ? parseInt(dayMatch[1], 10) : null;

  return (
    <div className="pt-4 h-full animate-in fade-in duration-500">
      <GameEngine 
        gameType="mcq" 
        curriculumData={examData} 
        isExamMode={true} 
        examId={trueExamId}
        dayNumber={extractedDayNumber} // <-- This triggers the Firebase save
        forceReviewMode={forceReview} 
        onExit={() => navigate('/arena')} 
      />
    </div>
  );
}