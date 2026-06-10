/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';

export default function LeaderboardPage() {
  const { get } = useApi();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/rankings').then(data => { setRankings(data); setLoading(false); }).catch(() => setLoading(false));
  }, [get]);

  if (loading) return <div className="text-center p-8">LOADING...</div>;

  return (
    <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">🏆 LEADERBOARD</h1>
      <div className="arcade-card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b-4 border-neon-cyan">
            <tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">USERNAME</th><th className="px-4 py-3 text-center">WINS</th><th className="px-4 py-3 text-center">LOSSES</th><th className="px-4 py-3 text-center">WIN%</th></tr>
          </thead>
          <tbody>
            {rankings.map((user, idx) => (
              <tr key={user.id} className="border-b border-neon-cyan hover:bg-neon-yellow/20 transition-colors">
                <td className="px-4 py-2 font-bold">{idx+1}</td>
                <td className="px-4 py-2">{user.username}</td>
                <td className="px-4 py-2 text-center text-neon-cyan">{user.wins}</td>
                <td className="px-4 py-2 text-center text-neon-cyan">{user.losses}</td>
                <td className="px-4 py-2 text-center text-neon-cyan">{user.winRate || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </motion.div>
  );
}