/* eslint-disable react-hooks/immutability */
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import { motion } from 'framer-motion';

export default function FriendsPage() {
  const { get, post, del } = useApi();
  const socket = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadFriends();
    loadRequests();
    if (socket) {
      socket.on('friend:request', () => { console.log('Friend request event received'); loadRequests(); });
      return () => socket.off('friend:request');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const loadFriends = async () => {
    try {
      console.log('FriendsPage: loading friends...');
      const data = await get('/friends');
      console.log('FriendsPage: friends', data);
      setFriends(data);
    } catch (err) { console.error('loadFriends error', err); }
  };
  const loadRequests = async () => {
    try {
      const data = await get('/friends/requests');
      setRequests(data);
    } catch (err) { console.error('loadRequests error', err); }
  };
  const searchUsers = async () => {
    if (searchQuery.length < 2) return;
    try {
      const data = await get(`/friends/search?q=${searchQuery}`);
      setSearchResults(data);
    } catch (err) { console.error('search error', err); }
  };
  const sendRequest = async (userId) => {
    try {
      console.log('Sending friend request to', userId);
      await post('/friends/request', { targetUserId: Number(userId) });
      alert('Friend request sent');
      searchUsers();
    } catch (err) {
      console.error('sendRequest error', err);
      alert(err.message);
    }
  };
  const acceptRequest = async (requestId) => {
    await post('/friends/accept', { requestId });
    loadFriends();
    loadRequests();
  };
  const rejectRequest = async (requestId) => {
    await post('/friends/reject', { requestId });
    loadRequests();
  };
  const removeFriend = async (friendId) => {
    await del(`/friends/${friendId}`);
    loadFriends();
  };
  const inviteToGame = (friendId) => {
    if (!socket) return;
    socket.emit('invite:send', { targetUserId: friendId, bet: 10 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-display font-bold mb-6 text-neon-cyan">👥 FRIENDS</h1>

        {/* Search */}
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
                <button onClick={() => sendRequest(u.id)} className="arcade-btn text-sm px-3 py-1">ADD</button>
              </div>
            ))}
          </div>
        </div>

        {/* Requests */}
        <div className="arcade-card p-4 mb-6">
          <h2 className="text-xl font-bold mb-3 text-neon-cyan">📨 PENDING REQUESTS</h2>
          {requests.length === 0 ? <div className="text-gray-400">No requests</div> :
            requests.map(req => (
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

        {/* Friends list */}
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
    </motion.div>
  );
}