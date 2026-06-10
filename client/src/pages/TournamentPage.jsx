import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';

export default function TournamentPage() {
  const { get } = useApi();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('TournamentPage: fetching tournaments...');
    get('/tournament')
      .then(data => {
        console.log('TournamentPage: data', data);
        setTournaments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('TournamentPage: error', err);
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
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-display font-bold mb-6 text-neon-cyan">🏆 TOURNAMENTS</h1>
        {tournaments.length === 0 ? (
          <div className="arcade-card p-8 text-center">
            <p className="text-xl text-neon-cyan">No active tournaments</p>
            <p className="text-sm text-gray-400 mt-2">Check back later or create one (admin only)</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map(t => (
              <div key={t.id} className="arcade-card p-4">
                <h2 className="text-xl font-bold text-neon-yellow">{t.name}</h2>
                <p>Entry Fee: {t.entryFee} 🎲</p>
                <p>Prize Pool: {t.prizePool} 🎲</p>
                <p>Players: {t.currentPlayers} / {t.maxPlayers}</p>
                <button className="arcade-btn mt-2">JOIN</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}