import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Target, Layers, ShieldAlert, Gamepad2, Play, BookOpen, ArrowLeft, Bolt, CheckCircle2, RotateCcw, Unlock, Lock } from 'lucide-react';
import LearningEngine from '../components/LearningEngine'; 
import GameEngine from '../components/GameEngine'; 

export default function DailySequence() {
  const [allMissions, setAllMissions] = useState([]);
  const [mission, setMission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drillsUnlocked, setDrillsUnlocked] = useState(false); 
  
  const [activeGame, setActiveGame] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [completedDrills, setCompletedDrills] = useState([]);
  
  // Track globally completed days (e.g., [1, 2])
  const [completedDays, setCompletedDays] = useState([]);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const snap = await getDocs(collection(db, 'daily_tasks'));
        if (!snap.empty) {
          const tasks = snap.docs.map(doc => doc.data());
          tasks.sort((a, b) => a.dayNumber - b.dayNumber);
          setAllMissions(tasks);
          
          const storedCompletedDays = JSON.parse(localStorage.getItem('psc_completed_days') || '[]');
          setCompletedDays(storedCompletedDays);

          // Find first uncompleted task, or default to the last available task
          const nextPendingTask = tasks.find(task => !storedCompletedDays.includes(task.dayNumber)) || tasks[tasks.length - 1];
          loadMissionState(nextPendingTask);
        }
      } catch (error) {
        console.error("Error loading mission:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMissions();
  }, []);

  const loadMissionState = (selectedMission) => {
    setMission(selectedMission);
    setGameStarted(false);
    setActiveGame(null);
    const savedDrills = JSON.parse(localStorage.getItem(`mission_${selectedMission.dayNumber}_drills`) || '[]');
    setCompletedDrills(savedDrills);
    
    // Auto-unlock drills if they've already finished the reading step before
    const savedStep = parseInt(localStorage.getItem(`psc_mission_${selectedMission.dayNumber}_step`)) || 0;
    const totalChapters = selectedMission.curriculumData?.study_material?.length || 0;
    setDrillsUnlocked(savedStep >= totalChapters && totalChapters > 0);
  };

  const handleMarkDrillComplete = (type) => {
    if (!completedDrills.includes(type)) {
      const updated = [...completedDrills, type];
      setCompletedDrills(updated);
      localStorage.setItem(`mission_${mission.dayNumber}_drills`, JSON.stringify(updated));
    }
  };

  const handleUnlockNextDay = () => {
    // 1. Mark current day as completed
    let updatedDays = [...completedDays];
    if (!completedDays.includes(mission.dayNumber)) {
      updatedDays = [...completedDays, mission.dayNumber];
      setCompletedDays(updatedDays);
      localStorage.setItem('psc_completed_days', JSON.stringify(updatedDays));
    }
    
    // 2. Load the next day automatically
    const nextMission = allMissions.find(m => m.dayNumber === mission.dayNumber + 1);
    if (nextMission) {
      loadMissionState(nextMission);
    } else {
      alert("You have conquered all available missions! Check back tomorrow for updates.");
    }
  };

  // --- FAVORITES SAVE FUNCTIONS ---
  const handleMemorizeTopic = (slideHeading, slideContent) => {
    const existing = JSON.parse(localStorage.getItem('psc_fav_memorized') || '[]');
    const newNote = { id: Date.now().toString(), heading: slideHeading, content: slideContent };
    localStorage.setItem('psc_fav_memorized', JSON.stringify([newNote, ...existing]));
  };

  const handleHighlightSentence = (sentenceText, sourceTopic) => {
    const existing = JSON.parse(localStorage.getItem('psc_fav_highlights') || '[]');
    const newHighlight = { id: Date.now().toString(), text: sentenceText, sourceTopic: sourceTopic };
    localStorage.setItem('psc_fav_highlights', JSON.stringify([newHighlight, ...existing]));
  };

  if (isLoading) return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"></div></div>;
  if (!mission) return <div className="text-center text-slate-400 p-10 font-bold border border-dashed border-slate-700 rounded-2xl m-6">No Active Missions Found. Awaiting Admin Deployment.</div>;

  // --- STRICT PROGRESSION LOGIC ---
  // Calculates what the highest open day is based on completed days
  const highestUnlockedDay = completedDays.length > 0 ? Math.max(...completedDays) + 1 : 1;

  // Ensure every available drill type has been completed before unlocking
  const areAllAvailableDrillsDone = ['mcq', 'flashcards', 'trap'].every(drillType => {
    const hasDataForDrill = 
      (drillType === 'mcq' && mission.curriculumData?.quizzes?.length > 0) ||
      (drillType === 'flashcards' && mission.curriculumData?.games?.flashcards?.length > 0) ||
      (drillType === 'trap' && mission.curriculumData?.games?.spot_the_trap?.length > 0);
    
    return !hasDataForDrill || completedDrills.includes(drillType);
  });

  // Mission is fully complete if reading is done AND all available drills are done
  const isMissionFullyComplete = drillsUnlocked && areAllAvailableDrillsDone;

  // --- GAME ARENA VIEW ---
  if (activeGame) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 shadow-lg">
          <button onClick={() => { setActiveGame(null); setGameStarted(false); }} className="flex items-center gap-2 text-slate-400 hover:text-white transition px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold">
            <ArrowLeft size={16} /> Retreat to Vault
          </button>
          <div className="flex items-center gap-2 font-black text-white uppercase tracking-widest text-sm">
            <Bolt className="text-brand-400" size={18} /> 
            {activeGame === 'mcq' && 'PSC Combat'}
            {activeGame === 'flashcards' && 'Memory Vault'}
            {activeGame === 'trap' && 'Spot the Trap'}
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Day {mission.dayNumber} Protocol</div>
        </div>

        <div className="flex-1 bg-civil-card rounded-2xl border border-brand-500/30 flex flex-col items-center justify-center p-6 md:p-10 shadow-[0_0_50px_rgba(245,158,11,0.05)] relative overflow-y-auto w-full">
          {!gameStarted ? (
            <div className="relative z-10 space-y-6 max-w-md text-center">
              <div className="w-20 h-20 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                {activeGame === 'mcq' && <Target size={32} className="text-rose-400" />}
                {activeGame === 'flashcards' && <Layers size={32} className="text-sky-400" />}
                {activeGame === 'trap' && <ShieldAlert size={32} className="text-amber-400" />}
              </div>
              <h2 className="text-3xl font-black text-white">System Ready</h2>
              <p className="text-slate-400 text-sm">The {activeGame} drill has securely loaded the AI-generated content from your curriculum.</p>
              <button onClick={() => setGameStarted(true)} className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 w-full">
                INITIALIZE GAME
              </button>
            </div>
          ) : (
            <GameEngine 
              gameType={activeGame} 
              curriculumData={mission.curriculumData} 
              onExit={() => { setActiveGame(null); setGameStarted(false); }}
              onMarkComplete={handleMarkDrillComplete}
            />
          )}
        </div>
      </div>
    );
  }

  const DrillButton = ({ type, icon: Icon, title, desc, colorClass }) => {
    const hasData = 
      (type === 'mcq' && mission.curriculumData?.quizzes?.length > 0) ||
      (type === 'flashcards' && mission.curriculumData?.games?.flashcards?.length > 0) ||
      (type === 'trap' && mission.curriculumData?.games?.spot_the_trap?.length > 0);
      
    if (!hasData) return null;

    const isDone = completedDrills.includes(type);
    const baseStyle = "w-full text-left p-5 rounded-2xl transition group relative overflow-hidden select-none border-2";
    const statusStyle = isDone ? "bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-900/40" : "bg-slate-900 border-slate-700 hover:border-brand-500 hover:bg-slate-800";

    return (
      <button onClick={() => setActiveGame(type)} className={`${baseStyle} ${statusStyle}`}>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className={`flex items-center gap-2 ${isDone ? 'text-emerald-400' : colorClass}`}>
            <Icon size={20} /> <span className="font-bold text-sm uppercase tracking-wide">{title}</span>
          </div>
          {isDone && <CheckCircle2 size={18} className="text-emerald-500" />}
        </div>
        <p className={`text-sm mb-4 relative z-10 ${isDone ? 'text-emerald-200/60' : 'text-slate-400'}`}>{desc}</p>
        <div className={`flex items-center gap-1.5 text-xs font-bold relative z-10 ${isDone ? 'text-emerald-500' : 'text-brand-400'}`}>
          {isDone ? <><RotateCcw size={14} className="group-hover:-rotate-90 transition duration-300" /> Re-attempt Drill</> : <>Launch Drill <Play size={14} className="group-hover:translate-x-1 transition" /></>}
        </div>
      </button>
    );
  };

  // --- STANDARD SEQUENCE VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* MISSION SELECTOR RIBBON WITH VISUAL LOCKS */}
      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
        {allMissions.map((m) => {
          const isLocked = m.dayNumber > highestUnlockedDay;
          const isActive = m.dayNumber === mission.dayNumber;
          const isDone = completedDays.includes(m.dayNumber);

          return (
            <button 
              key={m.dayNumber}
              onClick={() => !isLocked && loadMissionState(m)}
              disabled={isLocked}
              title={isLocked ? "Complete previous days to unlock" : "Available Mission"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all border-2 font-bold text-sm select-none shrink-0 ${
                isActive ? 'bg-brand-500 border-brand-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                isDone ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50 cursor-pointer' :
                isLocked ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 border-dashed cursor-not-allowed opacity-75' :
                'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 cursor-pointer'
              }`}
            >
              {isLocked && <Lock size={14} className="text-slate-500" />}
              Day {m.dayNumber}
              {isDone && <CheckCircle2 size={14} className={isActive ? "text-slate-950" : "text-emerald-500"} />}
            </button>
          );
        })}
      </div>

      <div className="bg-civil-card/70 backdrop-blur-md p-5 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 shrink-0 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 font-black text-xs uppercase tracking-widest border border-brand-500/30">Day {mission.dayNumber} Protocol</span>
          </div>
          {completedDays.includes(mission.dayNumber) && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">Mission Accomplished</span>}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{mission.title}</h1>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${drillsUnlocked ? 'lg:grid-cols-3' : 'max-w-5xl mx-auto w-full'}`}>
        
        {/* INTERACTIVE BOOK READER */}
        <div className={`bg-civil-card rounded-2xl border border-civil-border flex flex-col shadow-2xl ${drillsUnlocked ? 'lg:col-span-2' : ''}`}>
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between select-none">
            <h2 className="font-bold text-white flex items-center gap-2"><BookOpen className="text-brand-400" size={18} /> {drillsUnlocked ? 'Revision & Vault' : 'Interactive Book Reader'}</h2>
          </div>
          
          <LearningEngine 
            key={mission.dayNumber} 
            mission={mission} 
            onComplete={() => setDrillsUnlocked(true)} 
            onMemorize={handleMemorizeTopic}
            onHighlight={handleHighlightSentence}
          />
        </div>

        {/* DRILLS & UNLOCK NEXT DAY MODULE */}
        {drillsUnlocked && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 fade-in duration-700">
            <div className="bg-civil-card rounded-2xl border border-civil-border flex flex-col shadow-2xl h-fit">
              <div className="p-5 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center select-none">
                <h2 className="font-bold text-white flex items-center gap-2"><Gamepad2 className="text-brand-400" size={20} /> Purgatory Drills</h2>
              </div>
              <div className="p-5 space-y-4 bg-slate-900/30">
                <DrillButton type="mcq" icon={Target} title="PSC Combat" desc="Standard multiple-choice elimination." colorClass="text-rose-400" />
                <DrillButton type="flashcards" icon={Layers} title="Memory Vault" desc="Rapid-fire active recall." colorClass="text-sky-400" />
                <DrillButton type="trap" icon={ShieldAlert} title="Spot the Trap" desc="Identify tricky PSC statements." colorClass="text-amber-400" />
                
                {/* Fallback if no drills exist at all */}
                {(!mission.curriculumData?.quizzes?.length && !mission.curriculumData?.games?.flashcards?.length && !mission.curriculumData?.games?.spot_the_trap?.length) && (
                  <p className="text-sm text-slate-500 font-semibold text-center py-4 border border-dashed border-slate-700 rounded-xl">No active recall drills generated for this specific module.</p>
                )}
              </div>
            </div>

            {/* UNLOCK NEXT DAY BUTTON */}
            {isMissionFullyComplete && !completedDays.includes(mission.dayNumber) && (
              <button 
                onClick={handleUnlockNextDay}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-lg rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition active:scale-95 flex items-center justify-center gap-2 animate-bounce"
              >
                <Unlock size={24} /> Log Mission & Unlock Next Day
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}