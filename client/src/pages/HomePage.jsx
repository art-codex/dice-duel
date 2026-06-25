
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useApi } from '../hooks/useApi';
import { motion } from 'framer-motion';
import InviteModal from '../components/InviteModal';
import { Link2, Gamepad, DoorOpen } from 'lucide-react';


const PRESET_BETS = [10, 25, 50, 100, 250, 500];

export default function HomePage() {
  const socket = useSocket();
  const navigate = useNavigate();
  const { get } = useApi();
  const [rooms, setRooms] = useState([]);
  const [selectedBet, setSelectedBet] = useState(PRESET_BETS[0]);
  const [customBet, setCustomBet] = useState('');
  const [balance, setBalance] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // دریافت موجودی
  useEffect(() => {
    get('/coins/balance').then(bal => setBalance(bal)).catch(() => {});
  }, [get]);

  // دریافت لیست اتاق‌ها
  useEffect(() => {
    if (!socket) return;
    const handleRooms = (data) => setRooms(data);
    socket.on('lobby:rooms', handleRooms);
    socket.emit('lobby:get_rooms');
    return () => socket.off('lobby:rooms', handleRooms);
  }, [socket]);


  useEffect(() => {
  if (!socket) return;
  const onInviteAccepted = ({ roomId }) => {
    console.log('🎉 invite:accepted received, navigating to game', roomId);
    navigate(`/game/${roomId}?mode=playing`);
  };
  socket.on('invite:accepted', onInviteAccepted);
  return () => socket.off('invite:accepted');
}, [socket, navigate]);

  // گوش دادن به درخواست دعوت
  useEffect(() => {
    if (!socket) return;
    const onInviteReceived = ({ fromUserId, fromUsername, bet, roomId }) => {
      console.log(`📨 Invite from ${fromUsername} (ID:${fromUserId}) with bet ${bet}`);
      const accept = window.confirm(`${fromUsername} challenges you with ${bet} coins! Accept?`);
      if (accept) {
        socket.emit('invite:accept', { inviterId: fromUserId, roomId });
        navigate(`/game/${roomId}?mode=playing`);
      }
    };
    socket.on('invite:received', onInviteReceived);
    return () => socket.off('invite:received');
  }, [socket, navigate]);

  const getFinalBet = () => {
    if (customBet && !isNaN(parseInt(customBet))) return parseInt(customBet);
    return selectedBet;
  };

  const handleCreateRoom = () => {
    const bet = getFinalBet();
    if (!bet || bet < 10 || bet > 1000) {
      setErrorMsg('Bet must be between 10 and 1000 coins');
      return;
    }
if (balance && bet > balance.available) {
  setErrorMsg(`You only have ${balance.available} coins`);
  return;
}
    if (!socket) return;
    socket.emit('room:create', { bet }, (response) => {
      if (response.success) navigate(`/game/${response.roomId}?mode=waiting`);
      else setErrorMsg(response.message);
    });
  };

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit('room:join', { roomId }, (response) => {
      if (response.success) navigate(`/game/${roomId}?mode=playing`);
      else setErrorMsg(response.message);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* موجودی و دکمه دعوت */}
        {balance && (
          <div className="flex justify-between items-center mb-4">
            <div className="arcade-card px-4 py-2 text-neon-cyan font-bold">
               {balance.available} COINS
            </div>
            <button onClick={() => setShowInviteModal(true)} className="arcade-btn text-sm">
              <Link2 size={18}/>
            </button>
          </div>
        )}

        {/* کارت ساخت دوئل */}
        <div className="arcade-card mb-8">
          <div className="border-b border-neon-cyan/30 p-4 text-xl font-display justify-between font-bold text-neon-cyan">
 
            <Gamepad size={24}/>
            

          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {PRESET_BETS.map(bet => (
                <button
                  key={bet}
                  onClick={() => { setSelectedBet(bet); setCustomBet(''); }}
                  className={`px-4 py-2 rounded-full font-bold transition-all ${
                    selectedBet === bet && customBet === ''
                      ? 'bg-neon-cyan text-arcade-bg shadow-[0_0_12px_#00f3ff]'
                      : 'bg-arcade-bg border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10'
                  }`}
                >
                  {bet}
                </button>
              ))}
              <input
                type="number"
                value={customBet}
                onChange={(e) => { setCustomBet(e.target.value); setSelectedBet(null); }}
                placeholder="CUSTOM"
                className="arcade-input w-28 text-center"
              />
            </div>
            <div className="flex flex-wrap gap-5 justify-center">
              <button onClick={handleCreateRoom} className="arcade-btn w-5/12 py-3 text-xl">
                ▶ START DUEL
              </button>
            </div>
            {errorMsg && (
              <div className="mt-4 border border-neon-cyan/50 bg-neon-pink/10 text-neon-cyan p-3 rounded-2xl text-center">
                ⚠️ {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* لیست اتاق‌ها */}
        <div className="arcade-card">
          <div className="border-b border-neon-cyan/30 p-4 flex justify-between items-center">
            <span className="text-xl font-display font-bold text-neon-cyan"><DoorOpen size={24}/></span>
            <span className="px-3 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan text-sm">
              {rooms.length}
            </span>
          </div>
          <div className="p-4 max-h-125 overflow-y-auto space-y-3">
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-gray-400 font-body">📭 NO ROOMS YET</div>
            ) : (
              rooms.map(room => (
                <div key={room.id} className="bg-arcade-bg/60 border border-neon-cyan/50 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🎲</span>
                    <div>
                      <p className="font-bold text-neon-yellow">BET {room.bet} COINS</p>
                      <p className="text-xs text-gray-400">{room.playersCount || 1}/2 PLAYERS</p>
                    </div>
                  </div>
                  <button onClick={() => joinRoom(room.id)} className="arcade-btn px-5 py-1 text-base">
                    JOIN
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* نمایش مودال دعوت در صورت نیاز */}
        {showInviteModal && (
          <InviteModal
            onClose={() => setShowInviteModal(false)}
            defaultBet={getFinalBet()}
          />
        )}
      </div>
    </motion.div>
  );
}