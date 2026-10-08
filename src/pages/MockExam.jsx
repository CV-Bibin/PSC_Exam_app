import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext'; 
import { Timer, AlertOctagon, CheckCircle2, XCircle, ArrowRight, Target, ShieldAlert, Trophy, LayoutDashboard, RotateCcw, BookmarkPlus } from 'lucide-react';

export default function MockExam() {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const storageKey = `psc_exam_state_${examId}`;
  const [savedState, setSavedState] = useState(() => JSON.parse(localStorage.getItem(storageKey) || 'null'));
  
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex || 0);
  const [score, setScore] = useState(savedState?.score || 0);
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft || 0);
  const [examFinished, setExamFinished] = useState(savedState?.isFinished || false);
  const [isRetryMode, setIsRetryMode] = useState(false); 
  
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  // Track if current question is bookmarked
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      if (examId === 'dynamic') {
        const daysParam = searchParams.get('days');
        if (!daysParam) return;
        
        const daysToTest = daysParam.split(',').map(Number);
        const snap = await getDocs(collection(db, 'daily_tasks'));
        let allMCQs = [];
        let allTraps = [];

        snap.docs.forEach(doc => {
          const data = doc.data();
          if (daysToTest.includes(data.dayNumber)) {
            if (data.curriculumData?.quizzes) allMCQs.push(...data.curriculumData.quizzes);
            if (data.curriculumData?.games?.spot_the_trap) allTraps.push(...data.curriculumData.games.spot_the_trap);
          }
        });

        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const mockQuestions = [
          ...shuffle(allMCQs).slice(0, 30).map(q => ({ ...q, gameType: 'mcq' })),
          ...shuffle(allTraps).slice(0, 20).map(q => ({ ...q, gameType: 'trap' }))
        ];

        const generatedData = {
          title: 'Personalized Sunday Mock',
          timeLimitMinutes: mockQuestions.length,
          questions: mockQuestions,
          daysTested: daysToTest
        };

        setExamData(generatedData);
        setQuestions(shuffle(mockQuestions)); 
        if (!savedState) setTimeLeft(generatedData.timeLimitMinutes * 60);
      } else {
        const docSnap = await getDoc(doc(db, 'weekly_mocks', examId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExamData(data);
          if (!savedState) setTimeLeft(data.timeLimitMinutes * 60);

          const combined = [
            ...(data.questions.mcq || []).map(q => ({ ...q, gameType: 'mcq' })),
            ...(data.questions.trap || []).map(q => ({ ...q, gameType: 'trap' }))
          ].sort(() => Math.random() - 0.5); 
          
          setQuestions(combined);
        }
      }
    };
    fetchExam();
  }, [examId, searchParams]);

  useEffect(() => {
    if (!isRetryMode && examData) {
      localStorage.setItem(storageKey, JSON.stringify({
        currentIndex, score, timeLeft, isFinished: examFinished
      }));
    }
  }, [currentIndex, score, timeLeft, examFinished, isRetryMode]);

  useEffect(() => {
    if (!examData || examFinished || timeLeft <= 0) {
      if (timeLeft === 0 && examData && !examFinished) finishExam();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, examFinished, examData]);

  // SMART TOGGLE LISTENER: Check if current question is already in Vault
  useEffect(() => {
    if (questions.length > 0) {
      const currentQ = questions[currentIndex];
      const existing = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]');
      
      const isSaved = existing.some(q => 
        (q.question && q.question === currentQ.question) || 
        (q.statement && q.statement === currentQ.statement)
      );
      setIsBookmarked(isSaved);
    }
  }, [currentIndex, questions]);

  const finishExam = async () => {
    setExamFinished(true);
    if (!isRetryMode) {
      // Clear Notification Badge Logic
      const completedExams = JSON.parse(localStorage.getItem('psc_completed_exams') || '[]');
      if (!completedExams.includes(examId)) {
        localStorage.setItem('psc_completed_exams', JSON.stringify([...completedExams, examId]));
      }

      if (examId === 'dynamic' && examData?.daysTested) {
        const tested = JSON.parse(localStorage.getItem('psc_tested_days') || '[]');
        const newTested = [...new Set([...tested, ...examData.daysTested])];
        localStorage.setItem('psc_tested_days', JSON.stringify(newTested));
      }
      if (user) {
        try {
          await addDoc(collection(db, 'exam_results'), {
            userId: user.uid,
            email: user.email,
            examType: examId === 'dynamic' ? 'Personalized Mock' : 'Global Mock',
            score: score,
            totalQuestions: questions.length,
            timeRemaining: timeLeft,
            submittedAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Failed to save result to server", error);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      finishExam();
    } else {
      setShowResult(false);
      setSelectedAnswer(null);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const startRetry = () => {
    setIsRetryMode(true);
    setExamFinished(false);
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(examData.timeLimitMinutes * 60);
    setShowResult(false);
    setSelectedAnswer(null);
  };

  // TOGGLE SAVE LOGIC
  const handleBookmarkQuestion = () => {
    const currentQ = questions[currentIndex];
    let existing = JSON.parse(localStorage.getItem('psc_fav_questions') || '[]');
    
    if (isBookmarked) {
      // UNSAVE
      existing = existing.filter(q => 
        !(q.question && q.question === currentQ.question) && 
        !(q.statement && q.statement === currentQ.statement)
      );
      localStorage.setItem('psc_fav_questions', JSON.stringify(existing));
      setIsBookmarked(false);
    } else {
      // SAVE
      const newFav = { ...currentQ, id: Date.now().toString() };
      localStorage.setItem('psc_fav_questions', JSON.stringify([newFav, ...existing]));
      setIsBookmarked(true);
    }
  };

  const formatTime = (sec) => `${Math.floor(sec / 60)}:${sec % 60 < 10 ? '0' : ''}${sec % 60}`;

  if (!examData || questions.length === 0) return <div className="flex justify-center items-center h-screen"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;

  if (examFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto mt-10 text-center animate-in zoom-in-95 duration-500">
        <div className="bg-civil-card p-10 rounded-3xl border border-civil-border shadow-2xl">
          <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={48} />
          </div>
          <h2 className="text-4xl font-black text-white mb-2">Exam Concluded</h2>
          <p className="text-slate-400 mb-2">{examData.title}</p>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
            <div><span className="block text-4xl font-black text-brand-400">{score} <span className="text-xl text-slate-500">/ {questions.length}</span></span><span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 block">Final Score</span></div>
            <div><span className={`block text-4xl font-black ${percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{percentage}%</span><span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 block">Accuracy</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/dashboard')} className="py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl transition flex justify-center items-center gap-2"><LayoutDashboard size={20} /> HQ</button>
            <button onClick={startRetry} className="py-4 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl transition flex justify-center items-center gap-2"><RotateCcw size={20} /> Re-Attempt</button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-lg sticky top-20 z-10">
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 font-black text-sm border ${timeLeft < 300 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse' : 'bg-slate-950 text-brand-400 border-slate-800'}`}>
          <Timer size={18} /> {formatTime(timeLeft)}
        </div>
        <div className="text-sm font-bold text-slate-400">
          Question <span className="text-white text-lg">{currentIndex + 1}</span> / {questions.length}
        </div>
      </div>

      <div className="bg-civil-card p-6 md:p-10 rounded-3xl border border-civil-border shadow-2xl relative">
        
        {/* SMART BOOKMARK TOGGLE BUTTON */}
        <button 
          onClick={handleBookmarkQuestion} 
          className={`absolute top-6 right-6 p-3 rounded-xl transition flex items-center gap-2 text-sm font-bold ${
            isBookmarked 
            ? 'bg-brand-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookmarkPlus size={18} className={isBookmarked ? 'fill-slate-950' : ''} /> 
          {isBookmarked ? 'Saved to Vault' : 'Save Question'}
        </button>

        {currentQ.gameType === 'mcq' && (
          <div className="space-y-8 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-widest mb-2"><Target size={14}/> Multiple Choice</div>
            <h3 className="text-2xl font-black text-white leading-relaxed pr-16">{currentQ.question}</h3>
            <div className="space-y-4">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === currentQ.correct_answer;
                let btnClass = "bg-slate-900 border-slate-700 hover:border-brand-500 hover:bg-slate-800 text-slate-200";
                if (showResult) {
                  if (isCorrect) btnClass = "bg-emerald-950/50 border-emerald-500 text-emerald-100";
                  else if (isSelected) btnClass = "bg-rose-950/50 border-rose-500 text-rose-100";
                  else btnClass = "bg-slate-950 border-slate-800 text-slate-600 opacity-50";
                }
                return (
                  <button key={idx} disabled={showResult} onClick={() => { setSelectedAnswer(opt); setShowResult(true); if (opt === currentQ.correct_answer) setScore(s => s + 1); }} className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-semibold text-lg ${btnClass}`}>
                    <span className="mr-4 text-slate-500">{['A','B','C','D'][idx]}.</span> {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentQ.gameType === 'trap' && (
          <div className="space-y-8 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-2"><AlertOctagon size={14}/> True or Trap?</div>
            <div className="bg-slate-800 p-8 rounded-3xl border-2 border-slate-700 text-center">
              <h3 className="text-2xl font-black text-white leading-relaxed pr-12">"{currentQ.statement}"</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button disabled={showResult} onClick={() => { setSelectedAnswer(true); setShowResult(true); if (true === currentQ.is_true) setScore(s => s + 1); }} className={`p-6 border-2 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg ${showResult && currentQ.is_true ? 'bg-emerald-600 border-emerald-500 text-white' : showResult && selectedAnswer === true ? 'bg-rose-950 border-rose-500 text-rose-400' : showResult ? 'opacity-50 bg-slate-900 border-slate-800 text-slate-500' : 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-600 hover:text-white text-emerald-400'}`}>
                <CheckCircle2 size={32} /> FACT (True)
              </button>
              <button disabled={showResult} onClick={() => { setSelectedAnswer(false); setShowResult(true); if (false === currentQ.is_true) setScore(s => s + 1); }} className={`p-6 border-2 font-bold rounded-2xl transition flex flex-col items-center gap-3 text-lg ${showResult && !currentQ.is_true ? 'bg-emerald-600 border-emerald-500 text-white' : showResult && selectedAnswer === false ? 'bg-rose-950 border-rose-500 text-rose-400' : showResult ? 'opacity-50 bg-slate-900 border-slate-800 text-slate-500' : 'bg-rose-950/40 border-rose-500/50 hover:bg-rose-600 hover:text-white text-rose-400'}`}>
                <ShieldAlert size={32} /> TRAP (False)
              </button>
            </div>
          </div>
        )}

        {showResult && (
          <div className="mt-8 pt-8 border-t border-slate-800 animate-in slide-in-from-bottom-4">
            <h4 className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-3">AI Explanation</h4>
            <p className="text-base text-slate-300 leading-relaxed mb-6 bg-slate-900 p-5 rounded-xl border border-slate-800">
              {currentQ.gameType === 'mcq' ? currentQ.explanation : <><span className="text-amber-400 font-bold block mb-1">The Catch:</span>{currentQ.catch}</>}
            </p>
            <button onClick={handleNext} className="w-full py-4 bg-brand-500 text-slate-950 font-black text-lg rounded-xl transition shadow-lg flex justify-center items-center gap-2">
              {currentIndex + 1 >= questions.length ? 'Submit Final Exam' : 'Next Question'} <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}