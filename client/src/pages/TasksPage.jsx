/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';

export default function TasksPage() {
  const { post, get } = useApi();
  const [message, setMessage] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [taskStatus, setTaskStatus] = useState({
    daily: false, telegram: false, instagram: false, robika: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('taskStatus');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setTaskStatus(JSON.parse(saved));
  }, []);

  const handleDailyReward = async () => {
    try {
      const data = await post('/tasks/daily-reward');
      setMessage(data.message);
      setTaskStatus({ ...taskStatus, daily: true });
    } catch (err) { setMessage(err.message); }
  };
  const handleReferral = async () => {
    const code = prompt('Enter referral code:');
    if (code) {
      try {
        const data = await post('/tasks/referral', { code });
        setMessage(data.message);
      } catch (err) { setMessage(err.message); }
    }
  };
  const handleTelegram = async () => {
    try {
      const data = await post('/tasks/verify-telegram');
      setMessage(data.message);
      setTaskStatus({ ...taskStatus, telegram: true });
    } catch (err) { setMessage(err.message); }
  };
  const handleInstagram = async () => {
    try {
      const data = await post('/tasks/verify-instagram');
      setMessage(data.message);
      setTaskStatus({ ...taskStatus, instagram: true });
    } catch (err) { setMessage(err.message); }
  };
  const handleRobika = async () => {
    try {
      const data = await post('/tasks/verify-robika');
      setMessage(data.message);
      setTaskStatus({ ...taskStatus, robika: true });
    } catch (err) { setMessage(err.message); }
  };

  useEffect(() => {
    get('/auth/referral-code').then(data => setReferralCode(data.code)).catch(() => {});
  }, [get]);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setMessage('Referral link copied!');
    setTimeout(() => setMessage(''), 2000);
  };

  const tasks = [
    { id: 'daily', title: 'DAILY REWARD', description: 'Get 10 coins every day', reward: 10, icon: '🎁', action: handleDailyReward, isCompleted: taskStatus.daily },
    { id: 'telegram', title: 'TELEGRAM CHANNEL', description: 'Join Telegram and get 5 coins', reward: 5, icon: '📱', action: handleTelegram, externalLink: 'https://t.me/DiceDuelChannel', isCompleted: taskStatus.telegram },
    { id: 'instagram', title: 'INSTAGRAM', description: 'Follow Instagram and get 5 coins', reward: 5, icon: '📸', action: handleInstagram, externalLink: 'https://instagram.com/diceduel', isCompleted: taskStatus.instagram },
    { id: 'robika', title: 'ROBIKA', description: 'Join Rubika and get 5 coins', reward: 5, icon: '🤖', action: handleRobika, externalLink: 'https://rubika.ir/diceduel', isCompleted: taskStatus.robika },
    { id: 'referral', title: 'INVITE FRIENDS', description: 'Get 20 coins per friend', reward: 20, icon: '👥', action: handleReferral, isCompleted: false, custom: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
     transition={{ duration: 0.2 }}
      >
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8"><span className="text-3xl">🎯</span><h1 className="text-3xl font-bold">MISSIONS</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tasks.map(task => (
          <div key={task.id} className={`arcade-card ${task.isCompleted ? 'opacity-50' : ''}`}>
            <div className="border-b border-neon-cyan px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><span className="text-3xl">{task.icon}</span><h2 className="text-xl font-bold">{task.title}</h2></div>
              <div className="arcade-card border border-neon-cyan px-3 py-1 text-sm">+{task.reward} 🎲</div>
            </div>
            <div className="p-6">
              <p className="mb-4">{task.description}</p>
              {task.externalLink && !task.isCompleted && (
                <a href={task.externalLink} target="_blank" rel="noopener noreferrer" className="text-neon-cyan underline block mb-3">🔗 LINK</a>
              )}
              {task.id === 'referral' && referralCode && (
                <div className="border-2 border-neon-cyan p-3 mb-4">
                  <p className="text-xs mb-1">YOUR REFERRAL LINK:</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <code className="text-sm bg-retro-black px-2 py-1 flex-1 truncate">{referralCode}</code>
                    <button onClick={copyReferralLink} className="neon-btn px-3 py-1 text-sm">COPY</button>
                  </div>
                </div>
              )}
              <button onClick={task.action} disabled={task.isCompleted} className={`arcade-btn px-3 retro-btn w-full py-2 ${task.isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {task.isCompleted ? '✓ CLAIMED' : task.buttonText || 'CLAIM'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {message && <div className="mt-6 arcade-card p-4 text-center">{message}</div>}
    </div>
    </motion.div>
  );
}