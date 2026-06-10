/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export default function MatchHistoryPage() {
  const { get } = useApi();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('MatchHistoryPage: fetching history...');
    get('/coins/match-history')
      .then(data => {
        console.log('MatchHistoryPage: history data', data.length);
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('MatchHistoryPage: error', err);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="text-center p-8 text-neon-cyan">LOADING...</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-3xl font-display font-bold mb-6 text-neon-cyan">📜 MATCH HISTORY</h1>
        {history.length === 0 ? (
          <div className="arcade-card p-8 text-center">
            <p className="text-xl text-neon-cyan">No matches played yet</p>
            <p className="text-sm text-gray-400 mt-2">Start a duel to see your history</p>
          </div>
        ) : (
          <div className="overflow-x-auto arcade-card">
            <table className="w-full text-left border-collapse">
              <thead className="border-b-2 border-neon-cyan">
                <tr><th className="p-3">DATE</th><th className="p-3">OPPONENT</th><th className="p-3">BET</th><th className="p-3">RESULT</th><th className="p-3">DICE</th></tr>
              </thead>
              <tbody>
                {history.map(m => {
                  const isWinner = m.winnerId === user?.id;
                  const opponentId = m.player1Id === user?.id ? m.player2Id : m.player1Id;
                  const opponentName = opponentId === user?.id ? 'You' : `Player ${opponentId}`;
                  let dice1, dice2;
                  try {
                    dice1 = JSON.parse(m.dice1);
                    dice2 = JSON.parse(m.dice2);
                  } catch(e) { dice1 = [0,0]; dice2 = [0,0]; }
                  const myDice = m.player1Id === user?.id ? dice1 : dice2;
                  return (
                    <tr key={m.id} className="border-b border-neon-cyan/30 hover:bg-neon-cyan/10">
                      <td className="p-3 text-sm">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 font-bold">{opponentName}</td>
                      <td className="p-3">{m.bet} 🎲</td>
                      <td className={`p-3 font-bold ${isWinner ? 'text-neon-cyan' : 'text-neon-red'}`}>
                        {isWinner ? 'WIN' : 'LOSS'}
                      </td>
                      <td className="p-3">{myDice.join(', ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}