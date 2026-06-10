import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

export default function InviteModal({ onClose, defaultBet }) {
  const socket = useSocket();
  const [targetUserId, setTargetUserId] = useState('');
  const [bet, setBet] = useState(defaultBet || 10);
  const [loading, setLoading] = useState(false);

  const handleInvite = () => {
    if (!socket) {
      alert('Not connected to server');
      return;
    }
    if (!targetUserId) {
      alert('Please enter friend\'s User ID');
      return;
    }
    const userIdNum = parseInt(targetUserId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      alert('Invalid User ID');
      return;
    }
    if (userIdNum === socket.userId) {
      alert('You cannot invite yourself');
      return;
    }
    setLoading(true);
    console.log(`Sending invite to ${userIdNum} with bet ${bet}`);
    socket.emit('invite:send', { targetUserId: userIdNum, bet }, (response) => {
      setLoading(false);
      if (response && response.error) {
        console.error('Invite error:', response.error);
        alert(response.error);
      } else {
        console.log('Invite sent successfully', response);
        alert('Invite sent! Waiting for response...');
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-80">
        <h3 className="text-xl font-bold mb-4">INVITE FRIEND</h3>
        <input
          type="number"
          placeholder="Friend's User ID"
          className="w-full p-2 rounded bg-gray-700 mb-3"
          value={targetUserId}
          onChange={e => setTargetUserId(e.target.value)}
        />
        <input
          type="number"
          placeholder="Bet amount"
          className="w-full p-2 rounded bg-gray-700 mb-4"
          value={bet}
          onChange={e => setBet(Number(e.target.value))}
        />
        <div className="flex gap-2">
          <button onClick={handleInvite} disabled={loading} className="flex-1 bg-green-600 py-2 rounded">
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-600 py-2 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}