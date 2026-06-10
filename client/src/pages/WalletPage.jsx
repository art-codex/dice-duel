/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';

export default function WalletPage() {
  const { get } = useApi();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const cardNumber = '6037-****-****-1234';
  const telegramSupport = '@DiceDuelSupport';

  useEffect(() => {
    (async () => {
      try {
        const bal = await get('/coins/balance');
        setBalance(bal);
        const txns = await get('/coins/transactions');
        setTransactions(txns);
      } catch (err) { setMessage(err.message); }
    })();
  }, [get]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cardNumber);
    setCopySuccess('✅ COPIED!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'WIN': return '🏆'; case 'LOSS': return '💸';
      case 'LOCK': return '🔒'; case 'UNLOCK': return '🔓';
      case 'DAILY_REWARD': return '🎁'; case 'TASK_TELEGRAM': return '📱';
      case 'REFERRAL': return '👥'; case 'PURCHASE': return '💳';
      default: return '📝';
    }
  };

  const getTransactionColor = (type, amount) => {
    if (amount > 0 && (type === 'WIN' || type === 'DAILY_REWARD' || type === 'REFERRAL' || type === 'TASK_TELEGRAM' || type === 'PURCHASE'))
      return 'text-neon-cyan';
    if (amount < 0) return 'text-neon-cyan';
    return 'text-gray-400';
  };

  if (!balance) return <div className="flex justify-center items-center h-64"><div className="arcade-card px-4 py-2">LOADING...</div></div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
     transition={{ duration: 0.2 }}
      >
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8"><span className="text-3xl">💰</span><h1 className="text-3xl font-bold">WALLET</h1></div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="arcade-card p-6 text-center">
          <p className="text-sm">AVAILABLE</p>
          <p className="text-4xl font-bold text-neon-cyan">{balance.available} 🎲</p>
        </div>
        <div className="arcade-card border-neon-cyan p-6 text-center">
          <p className="text-sm">TOTAL COINS</p>
          <p className="text-2xl font-bold">{balance.coins} 🎲</p>
        </div>
        <div className="arcade-card border-neon-cyan p-6 text-center">
          <p className="text-sm">LOCKED</p>
          <p className="text-2xl font-bold">{balance.locked} 🎲</p>
        </div>
      </div>

      {/* Charge section */}
      <div className="arcade-card p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">💳 CHARGE COINS</h2>
        <div className="space-y-4">
          <div className="arcade-card border-neon-cyan p-4">
            <p className="mb-2">CARD NUMBER:</p>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <code className="text-xl font-mono text-neon-cyan">{cardNumber}</code>
              <button onClick={copyToClipboard} className="arcade-btn text-sm px-3 py-1">📋 COPY</button>
              
            </div>
            {copySuccess && <p className="text-neon-cyan text-sm mt-2">{copySuccess}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex gap-3"><span className="text-neon-cyan">1.</span> Transfer to card above</div>
            <div className="flex gap-3"><span className="text-neon-cyan">2.</span> Send receipt to {telegramSupport}</div>
            <div className="flex gap-3"><span className="text-neon-cyan">3.</span> Receive coins within 24h</div>
          </div>
          <a href={`https://t.me/${telegramSupport.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className=" w-12/12 arcade-btn px-3 neon-btn block text-center py-2">📱 CONTACT SUPPORT</a>
        </div>
      </div>

      {/* Transactions */}
      <div className="arcade-card p-6">
        <h2 className="text-xl font-bold mb-4">📜 RECENT TRANSACTIONS</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-8">📭 NO TRANSACTIONS</div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="arcade-card border-neon-cyan p-3 flex flex-wrap justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getTransactionIcon(tx.type)}</div>
                  <div>
                    <p className="font-bold">{tx.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`text-xl font-bold ${getTransactionColor(tx.type, tx.amount)}`}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🎲
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {message && <div className="mt-4 border-2 border-neon-cyan p-4 text-center">{message}</div>}
    </div>
    </motion.div>
  );
}