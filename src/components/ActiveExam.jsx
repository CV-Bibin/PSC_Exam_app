import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; // 🚀 Added useSearchParams
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import GameEngine from './GameEngine'; 

export default function ActiveExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // 🚀 Reads the URL for ?mode=review
  
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        // 1. Check Live Quizzes first
        let docRef = doc(db, 'live_quizzes', id); 
        let snap = await getDoc(docRef);
        
        // 2. If not found, check Weekly/Grand Mocks
        if (!snap.exists()) {
          docRef = doc(db, 'weekly_mocks', id);
          snap = await getDoc(docRef);
        }
        
        if (snap.exists()) {
          setExamData(snap.data());
        } else {
          console.error("Exam not found in either collection.");
        }
      } catch (error) {
        console.error("Firebase Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchExam();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-[70vh]"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!examData) return <div className="text-center text-rose-500 mt-20 font-bold text-2xl">Exam not found or expired.</div>;

  // Check attempts
  const attemptsMade = parseInt(localStorage.getItem(`psc_attempts_${id}`) || '0');
  const maxAllowed = examData?.maxAttempts === 'unlimited' ? Infinity : parseInt(examData?.maxAttempts || 1);
  const isExhausted = attemptsMade >= maxAllowed;

  // 🚀 CRITICAL FIX: Check if the URL explicitly asks for review mode
  const isReviewUrl = searchParams.get('mode') === 'review';
  
  // Force review if they maxed out attempts OR clicked the review button
  const forceReview = isExhausted || isReviewUrl;

  return (
    <div className="pt-4 h-full">
      <GameEngine 
        gameType="mcq" 
        curriculumData={examData} 
        isExamMode={true} 
        examId={id}
        forceReviewMode={forceReview} // 🚀 Flawlessly triggers the Tactical Answer Key!
        onExit={() => navigate('/arena')} 
      />
    </div>
  );
}