import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';
import { Gift, Send, Camera, Users, UserPlus, CheckCircle } from 'lucide-react';

export default function TasksPage() {
  const { post, get } = useApi();
  const [message, setMessage] = useState('');
  const [taskStatus, setTaskStatus] = useState({
    daily: false,
    telegram: false,
    instagram: false,
    robika: false,
    referral: false
  });

  useEffect(() => {
    loadTaskStatus();
  }, []);

  const loadTaskStatus = async () => {
    try {
      const status = await get('/tasks/task-status');
      setTaskStatus(status);
    } catch (err) {
      console.error('Failed to load task status', err);
    }
  };

  const handleDailyReward = async () => {
    try {
      const res = await post('/tasks/daily-reward');
      setMessage(res.message);
      setTaskStatus({ ...taskStatus, daily: true });
    } catch (e) {
      setMessage(e.message);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTelegram = async () => {
    window.open('https://t.me/DiceDuelChannel', '_blank');
    setTimeout(async () => {
      try {
        const res = await post('/tasks/verify-telegram');
        setMessage(res.message);
        setTaskStatus({ ...taskStatus, telegram: true });
      } catch (e) {
        setMessage(e.message);
      }
      setTimeout(() => setMessage(''), 3000);
    }, 2000);
  };

  const handleInstagram = async () => {
    window.open('https://instagram.com/diceduel', '_blank');
    setTimeout(async () => {
      try {
        const res = await post('/tasks/verify-instagram');
        setMessage(res.message);
        setTaskStatus({ ...taskStatus, instagram: true });
      } catch (e) {
        setMessage(e.message);
      }
      setTimeout(() => setMessage(''), 3000);
    }, 2000);
  };

  const handleRobika = async () => {
    window.open('https://rubika.ir/diceduel', '_blank');
    setTimeout(async () => {
      try {
        const res = await post('/tasks/verify-robika');
        setMessage(res.message);
        setTaskStatus({ ...taskStatus, robika: true });
      } catch (e) {
        setMessage(e.message);
      }
      setTimeout(() => setMessage(''), 3000);
    }, 2000);
  };

  const handleReferral = async () => {
    const code = prompt('Enter referral code:');
    if (code) {
      try {
        const res = await post('/tasks/referral', { code });
        setMessage(res.message);
        setTaskStatus({ ...taskStatus, referral: true });
      } catch (e) {
        setMessage(e.message);
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const tasks = [
    {
      id: 'daily',
      title: 'DAILY REWARD',
      description: 'Get 10 coins every day',
      reward: 10,
      icon: <Gift size={32} className="text-neon-cyan" />,
      action: handleDailyReward,
      isCompleted: taskStatus.daily
    },
    {
      id: 'telegram',
      title: 'TELEGRAM CHANNEL',
      description: 'Join Telegram channel and get 5 coins',
      reward: 5,
      icon: <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/telegram.svg" alt="Telegram" className="w-8 h-8" style={{ filter: 'invert(67%) sepia(84%) saturate(747%) hue-rotate(160deg) brightness(89%) contrast(89%)' }} />,
      action: handleTelegram,
      isCompleted: taskStatus.telegram
    },
    {
      id: 'instagram',
      title: 'INSTAGRAM',
      description: 'Follow Instagram and get 5 coins',
      reward: 5,
      icon: <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="Instagram" className="w-8 h-8" style={{ filter: 'invert(48%) sepia(78%) saturate(2066%) hue-rotate(298deg) brightness(94%) contrast(93%)' }} />,
      action: handleInstagram,
      isCompleted: taskStatus.instagram
    },
    {
      id: 'robika',
      title: 'ROBIKA',
      description: 'Join Rubika and get 5 coins',
      reward: 5,
      icon: <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">R</div>,
      action: handleRobika,
      isCompleted: taskStatus.robika
    },
    {
      id: 'referral',
      title: 'INVITE FRIENDS',
      description: 'Invite friends and get 20 coins',
      reward: 20,
      icon: <UserPlus size={32} className="text-neon-cyan" />,
      action: handleReferral,
      isCompleted: taskStatus.referral
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold text-neon-cyan">MISSIONS</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`arcade-card p-6 border-2 ${task.isCompleted ? 'border-green-500 opacity-60' : 'border-neon-cyan'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">{task.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neon-cyan">{task.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-neon-yellow font-bold">+{task.reward} coins</span>
                    {task.isCompleted && (
                      <span className="text-green-500 text-sm font-bold flex items-center gap-1">
                        <CheckCircle size={16} /> COMPLETED
                      </span>
                    )}
                  </div>
                  <button
                    onClick={task.action}
                    disabled={task.isCompleted}
                    className={`arcade-btn mt-4 px-4 py-2 ${task.isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {task.isCompleted ? 'DONE' : 'CLAIM'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {message && (
          <div className="mt-6 arcade-card p-4 text-center text-neon-cyan font-bold">
            {message}
          </div>
        )}
      </div>
    </motion.div>
  );
}