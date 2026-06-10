import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CountdownTimer({ seconds, active }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(seconds);
      return;
    }
    setTimeLeft(seconds);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, seconds]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / seconds) * circumference;
  const strokeDashoffset = circumference - progress;

  if (!active || timeLeft <= 0) return null;

  return (
    <div className="flex justify-center items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r={radius} stroke="#4B5563" strokeWidth="6" fill="none" />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#F59E0B"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-yellow-400">{timeLeft}</span>
        </div>
      </div>
    </div>
  );
}