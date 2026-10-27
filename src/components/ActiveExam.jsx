import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import GameEngine from './GameEngine'; 

export default function ActiveExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      console.log("🔍 SEARCHING FOR EXAM ID:", id); // Check your F12 Console!
      try {
        
        const docRef = doc(db, 'live_quizzes', id); 
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          console.log("✅ EXAM FOUND:", snap.data());
          setExamData(snap.data());
        } else {
          console.error("❌ EXAM NOT FOUND IN DATABASE! Checked collection: 'live_exams' for ID:", id);
        }
      } catch (error) {
        console.error("🔥 FIREBASE ERROR:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchExam();
    } else {
      console.error("❌ NO ID IN URL!");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] text-center animate-in fade-in">
        <h2 className="text-3xl font-black text-rose-500 mb-2">Exam Not Found</h2>
        <p className="text-slate-400 font-bold mb-8">This exam may have been removed or has expired.</p>
        <p className="text-xs text-slate-500 mb-4 font-mono">Debug ID: {id}</p>
        <button 
          onClick={() => navigate('/arena')} 
          className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black transition"
        >
          Return to Arena
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 h-full">
      <GameEngine 
        gameType="mcq" 
        curriculumData={examData} 
        isExamMode={true} 
        examId={id}
        onExit={() => navigate('/arena')} 
      />
    </div>
  );
}