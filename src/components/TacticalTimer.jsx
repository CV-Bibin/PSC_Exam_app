import { useState, useEffect } from 'react';
import { Timer, AlertOctagon } from 'lucide-react';

export default function TacticalTimer({ timeLimitMinutes, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCritical = timeLeft < 300; // Less than 5 minutes

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 shadow-inner transition-colors duration-500 ${
      isCritical 
        ? 'bg-rose-950/40 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.4)]' 
        : 'bg-slate-950 border-slate-700 text-sky-400'
    }`}>
      {isCritical ? <AlertOctagon size={20} /> : <Timer size={20} />}
      <span className="text-xl font-mono font-black tracking-widest">
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}