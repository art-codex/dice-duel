/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/immutability */
import { useEffect, useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { motion } from 'framer-motion';
import { Coins, Copy, Wallet, UserStar, Calendar, Users, Upload, Save, Headphones, Send } from 'lucide-react';

// ========== کامپوننت چت پشتیبانی (جاسازی شده در پروفایل) ==========
function SupportChat() {
  const { get, post } = useApi();
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await get('/support/messages');
      setMessages(data);
    } catch (err) {
      console.error('Failed to load support messages', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      await post('/support/message', {
        userId: user?.id || null,
        username: user?.username || 'کاربر',
        message: input.trim()
      });
      setInput('');
      await loadMessages();
    } catch (err) {
      console.error('Send failed', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-100 border border-neon-cyan/30 rounded-lg overflow-hidden bg-arcade-bg/50">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">هیچ پیامی وجود ندارد</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`text-sm ${msg.isFromAdmin ? 'bg-blue-900/50' : 'bg-gray-800'} p-2 rounded-lg`}>
              <span className="font-bold text-neon-cyan">{msg.isFromAdmin ? 'پشتیبانی: ' : (msg.username || 'کاربر') + ': '}</span>
              <span className="wrap-break-word">{msg.message}</span>
              <div className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 border-t border-gray-700 flex gap-2 bg-gray-900">
        <input
          className="flex-1 bg-gray-800 rounded-full px-3 py-1 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-neon-cyan"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="پیام خود را بنویسید..."
        />
        <button onClick={sendMessage} disabled={loading} className="bg-neon-cyan hover:bg-purple-500 text-black rounded-full px-3 py-1 flex items-center gap-1">
          <Send size={16} /> ارسال
        </button>
      </div>
    </div>
  );
}

// ========== صفحه اصلی پروفایل ==========
export default function ProfilePage() {
  const { get, post, del } = useApi();
  const { user } = useAuth();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('profile'); // profile, friends, history, wallet, support
  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [message, setMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Friends state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Wallet state
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const cardNumber = '6037-****-****-1234';
  const telegramSupport = '@DiceDuelSupport';

  // ========== Profile ==========
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await get('/users/profile');
      setProfile(data);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const res = await post('/users/upload-avatar', formData, {});
      setProfile({ ...profile, avatar: res.avatarUrl });
      setMessage('Avatar updated!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setMessage('Upload failed: ' + err.message);
    }
  };

  // ========== Friends ==========
  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends();
      loadFriendRequests();
      if (socket) {
        socket.on('friend:request', () => { loadFriendRequests(); });
        return () => socket.off('friend:request');
      }
    }
  }, [activeTab, socket]);

  const loadFriends = async () => {
    try {
      const data = await get('/friends');
      setFriends(data);
    } catch (err) { console.error('loadFriends error', err); }
  };
  const loadFriendRequests = async () => {
    try {
      const data = await get('/friends/requests');
      setFriendRequests(data);
    } catch (err) { console.error('loadRequests error', err); }
  };
  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    try {
      const data = await get(`/friends/search?q=${searchQuery}`);
      setSearchResults(data);
    } catch (err) { console.error('search error', err); }
  };
  const sendFriendRequest = async (userId) => {
    try {
      await post('/friends/request', { targetUserId: Number(userId) });
      alert('Friend request sent');
      searchUsers();
    } catch (err) { alert(err.message); }
  };
  const acceptRequest = async (requestId) => {
    await post('/friends/accept', { requestId });
    loadFriends();
    loadFriendRequests();
  };
  const rejectRequest = async (requestId) => {
    await post('/friends/reject', { requestId });
    loadFriendRequests();
  };
  const removeFriend = async (friendId) => {
    await del(`/friends/${friendId}`);
    loadFriends();
  };
  const inviteToGame = (friendId) => {
    if (!socket) return;
    socket.emit('invite:send', { targetUserId: friendId, bet: 10 });
  };

  // ========== History ==========
  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await get('/coins/match-history');
      setHistory(data);
    } catch (err) { console.error('history error', err); }
    setHistoryLoading(false);
  };

  // ========== Wallet ==========
  useEffect(() => {
    if (activeTab === 'wallet') loadWallet();
  }, [activeTab]);
  const loadWallet = async () => {
    try {
      const bal = await get('/coins/balance');
      setBalance(bal);
      const txns = await get('/coins/transactions');
      setTransactions(txns);
    } catch (err) { setMessage(err.message); }
  };
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
    if (amount < 0) return 'text-neon-red';
    return 'text-gray-400';
  };

  if (!profile) return <div className="text-center p-8 text-neon-cyan">LOADING...</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="max-w-6xl mx-auto p-4"
    >
      <div className="arcade-card p-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-neon-cyan/30 mb-6 pb-2">
          <button onClick={() => setActiveTab('profile')} className={`arcade-btn px-4 py-2 text-sm ${activeTab === 'profile' ? 'bg-neon-cyan text-black' : ''}`}><UserStar size={18} /></button>
          <button onClick={() => setActiveTab('friends')} className={`arcade-btn px-4 py-2 text-sm ${activeTab === 'friends' ? 'bg-neon-cyan text-black' : ''}`}><Users size={18} /></button>
          <button onClick={() => setActiveTab('history')} className={`arcade-btn px-4 py-2 text-sm ${activeTab === 'history' ? 'bg-neon-cyan text-black' : ''}`}><Calendar size={18} /></button>
          <button onClick={() => setActiveTab('wallet')} className={`arcade-btn px-4 py-2 text-sm ${activeTab === 'wallet' ? 'bg-neon-cyan text-black' : ''}`}><Wallet size={18} /></button>
          <button onClick={() => setActiveTab('support')} className={`arcade-btn px-4 py-2 text-sm ${activeTab === 'support' ? 'bg-neon-cyan text-black' : ''}`}><Headphones size={18} /></button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-neon-cyan overflow-hidden mb-3 bg-arcade-bg">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    onError={(e) => { e.target.src = '/default-avatar.png'; console.error('Avatar failed to load:', profile.avatar); }}
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neon-cyan">
                    {profile.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="arcade-btn cursor-pointer text-sm px-3 py-1 flex items-center gap-1">
                  <Upload size={16} className="inline-block align-middle" /> Upload
                  <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} className="hidden" />
                </label>
                <button onClick={uploadAvatar} disabled={!avatarFile} className="arcade-btn text-sm px-3 py-1 flex items-center gap-1">
                  <Save size={16} className="inline-block align-middle"/> Save
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-neon-cyan p-4 rounded">
                <div className="text-neon-cyan text-sm">USERNAME</div>
                <div className="text-2xl font-bold text-neon-yellow">{profile.username}</div>
              </div>
              <div className="border border-neon-cyan p-4 rounded">
                <div className="text-neon-cyan text-sm">LEVEL</div>
                <div className="text-2xl font-bold text-neon-yellow">{profile.level || 1}</div>
              </div>
              <div className="border border-neon-cyan p-4 rounded">
                <div className="text-neon-cyan text-sm">XP</div>
                <div className="text-xl font-bold">{profile.xp || 0} / {(profile.level || 1) * 100}</div>
              </div>
              <div className="border border-neon-yellow p-4 rounded">
                <div className="text-neon-yellow text-sm">💰 COINS</div>
                <div className="text-2xl font-bold">{profile.coins || 0} 🎲</div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div>
            <div className="arcade-card p-4 mb-6">
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyUp={searchUsers}
                className="neon-input w-full mb-2"
              />
              <div className="space-y-2">
                {searchResults.map(u => (
                  <div key={u.id} className="flex justify-between items-center border border-neon-cyan p-2">
                    <div className="flex items-center gap-3">
                      {u.avatar ? <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 bg-neon-cyan text-arcade-bg flex items-center justify-center rounded-full font-bold">{u.username.charAt(0)}</div>}
                      <span>{u.username} <span className="text-xs text-neon-cyan">Lv.{u.level}</span></span>
                    </div>
                    <button onClick={() => sendFriendRequest(u.id)} className="arcade-btn text-sm px-3 py-1">ADD</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="arcade-card p-4 mb-6">
              <h2 className="text-xl font-bold mb-3 text-neon-cyan">📨 PENDING REQUESTS</h2>
              {friendRequests.length === 0 ? <div className="text-gray-400">No requests</div> :
                friendRequests.map(req => (
                  <div key={req.requestId} className="flex justify-between items-center border-b border-gray-700 py-2">
                    <span>{req.username} <span className="text-xs text-gray-400">Lv.{req.level}</span></span>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(req.requestId)} className="arcade-btn text-sm px-3 py-1">✓ ACCEPT</button>
                      <button onClick={() => rejectRequest(req.requestId)} className="arcade-btn text-sm px-3 py-1">✗ REJECT</button>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="arcade-card p-4">
              <h2 className="text-xl font-bold mb-3 text-neon-yellow">⭐ YOUR FRIENDS</h2>
              {friends.length === 0 ? <div className="text-gray-400">No friends yet</div> :
                <div className="space-y-2">
                  {friends.map(f => (
                    <div key={f.id} className="flex justify-between items-center border-b border-gray-700 py-2">
                      <div className="flex items-center gap-3">
                        {f.avatar ? <img src={f.avatar} className="w-8 h-8 rounded-full" alt="" /> : <div className="w-8 h-8 bg-neon-yellow text-arcade-bg flex items-center justify-center rounded-full font-bold">{f.username.charAt(0)}</div>}
                        <div>
                          <span className="font-bold">{f.username}</span>
                          <div className="text-xs text-gray-400">Lv.{f.level}</div>
                          {f.lastMessage && <div className="text-xs text-neon-cyan">Last: {f.lastMessage}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => inviteToGame(f.id)} className="arcade-btn text-sm px-3 py-1">🎮 INVITE</button>
                        <button onClick={() => removeFriend(f.id)} className="arcade-btn text-sm px-3 py-1">❌ REMOVE</button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <div className="text-center p-8 text-neon-cyan">LOADING...</div>
            ) : history.length === 0 ? (
              <div className="arcade-card p-8 text-center">
                <p className="text-xl text-neon-cyan">No matches played yet</p>
                <p className="text-sm text-gray-400 mt-2">Start a duel to see your history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                      try { dice1 = JSON.parse(m.dice1); dice2 = JSON.parse(m.dice2); } catch(e) { dice1 = [0,0]; dice2 = [0,0]; }
                      const myDice = m.player1Id === user?.id ? dice1 : dice2;
                      return (
                        <tr key={m.id} className="border-b border-neon-cyan/30 hover:bg-neon-cyan/10">
                          <td className="p-3 text-sm">{new Date(m.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 font-bold">{opponentName}</td>
                          <td className="p-3">{m.bet} 🎲</td>
                          <td className={`p-3 font-bold ${isWinner ? 'text-neon-cyan' : 'text-neon-red'}`}>{isWinner ? 'WIN' : 'LOSS'}</td>
                          <td className="p-3">{myDice.join(', ')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && balance && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="arcade-card p-4 text-center">
                <div className="text-sm">AVAILABLE</div>
                <div className="text-3xl font-bold text-neon-cyan">{balance.available} 🎲</div>
              </div>
              <div className="arcade-card p-4 text-center">
                <div className="text-sm">TOTAL COINS</div>
                <div className="text-2xl font-bold">{balance.coins} 🎲</div>
              </div>
              <div className="arcade-card p-4 text-center">
                <div className="text-sm">LOCKED</div>
                <div className="text-2xl font-bold">{balance.locked} 🎲</div>
              </div>
            </div>
            <div className="arcade-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-4"><Coins className="text-neon-cyan" size={28} /></h2>
              <div className="space-y-4">
                <div className="border border-neon-cyan p-4">
                  <p className="mb-2">CARD NUMBER:</p>
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <code className="text-xl font-mono text-neon-cyan">{cardNumber}</code>
                    <button onClick={copyToClipboard} className="arcade-btn text-sm px-3 py-1"><Copy size={16} /></button>
                  </div>
                  {copySuccess && <p className="text-neon-cyan text-sm mt-2">{copySuccess}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-3"><span className="text-neon-cyan">1.</span> Transfer to card above</div>
                  <div className="flex gap-3"><span className="text-neon-cyan">2.</span> Send receipt to {telegramSupport}</div>
                  <div className="flex gap-3"><span className="text-neon-cyan">3.</span> Receive coins within 24h</div>
                </div>
                <a href={`https://t.me/${telegramSupport.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="arcade-btn block text-center py-2">📱 CONTACT SUPPORT</a>
              </div>
            </div>
            <div className="arcade-card p-6">
              <h2 className="text-xl font-bold mb-4">📜 RECENT TRANSACTIONS</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-8">📭 NO TRANSACTIONS</div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="border border-neon-cyan p-3 flex flex-wrap justify-between items-center">
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
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-neon-cyan">🎧 پشتیبانی</h2>
            <SupportChat />
          </div>
        )}
      </div>
      {message && <div className="mt-4 arcade-card p-2 text-center text-sm">{message}</div>}
    </motion.div>
  );
}