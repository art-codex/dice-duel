
import Confetti from 'react-confetti';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import Dice from '../components/Dice';
import CountdownTimer from '../components/CountdownTimer';
import { motion } from 'framer-motion';


export default function GameRoom() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isBotGame = searchParams.get('bot') === 'true';
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useAuth();
  const timerRef = useRef(null);

  const [currentTurn, setCurrentTurn] = useState(null);
  const [myDice, setMyDice] = useState([0, 0]);
  const [oppDice, setOppDice] = useState([0, 0]);
  const [myRolling, setMyRolling] = useState(false);
  const [oppRolling, setOppRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);


useEffect(() => {
  if (result && !result.tie && result.winnerId === user?.id) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }
}, [result, user]);


useEffect(() => {
  if (!socket) return;
  socket.on('invite:received', ({ fromUsername, bet, roomId, fromUserId }) => {
    if (window.confirm(`${fromUsername} challenges you with ${bet} coins! Accept?`)) {
      socket.emit('invite:accept', { inviterId: fromUserId, roomId });
      navigate(`/game/${roomId}?mode=playing`);
    }
  });
  return () => socket.off('invite:received');
}, [socket, navigate]);





  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!currentTurn) { setTimeLeft(0); return; }
    setTimeLeft(20);
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? (clearInterval(interval), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleTurn = useCallback(({ playerId }) => {
    setCurrentTurn(playerId);
    if (playerId === user?.id) setMyRolling(true);
    else setOppRolling(true);
  }, [user?.id]);

  const handleRollResult = useCallback(({ playerId, dice }) => {
    setTimeLeft(0);
    if (playerId === user?.id) { setMyDice(dice); setMyRolling(false); }
    else { setOppDice(dice); setOppRolling(false); }
    setCurrentTurn(null);
  }, [user?.id]);

  const handleGameResult = useCallback((data) => {
    setResult(data);
    setMyRolling(false); setOppRolling(false); setTimeLeft(0); setCurrentTurn(null);
  }, []);

  const handleGameError = useCallback((err) => {
    setError(err.message || 'GAME ERROR');
    setTimeout(() => navigate('/'), 3000);
  }, [navigate]);

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !socket) return;
    socket.emit('chat:message', { message: chatInput.trim() });
    setChatInput('');
  }, [chatInput, socket]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.on('game:your_turn', handleTurn);
    socket.on('game:roll_result', handleRollResult);
    socket.on('game:result', handleGameResult);
    socket.on('game:error', handleGameError);
    socket.on('chat:message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (!chatOpen) setUnreadMsgs(prev => prev + 1);
    });
    if (isBotGame && mode === 'playing' && roomId) socket.emit('bot:join', { roomId });
    return () => {
      socket.off('game:your_turn', handleTurn);
      socket.off('game:roll_result', handleRollResult);
      socket.off('game:result', handleGameResult);
      socket.off('game:error', handleGameError);
      socket.off('chat:message');
    };
  }, [socket, user, handleTurn, handleRollResult, handleGameResult, handleGameError, chatOpen, isBotGame, mode, roomId]);

  useEffect(() => {
    if (result) timerRef.current = setTimeout(() => navigate('/'), 10000);
    return () => clearTimeout(timerRef.current);
  }, [result, navigate]);

  const handleRollClick = () => {
    if (socket && currentTurn === user?.id && timeLeft > 0) socket.emit('game:roll');
  };
  const handleLeaveRoom = () => {
    if (socket && roomId) socket.emit('room:leave', roomId);
    navigate('/');
  };
  {showConfetti && <Confetti />}
  if (error) return <div className="p-8 text-center text-neon-cyan">{error}</div>;

  if (result) {
    const amIPlayer1 = user?.id === result.player1;
    const mySum = amIPlayer1 ? result.sum1 : result.sum2;
    const oppSum = amIPlayer1 ? result.sum2 : result.sum1;
    const won = result.winnerId === user?.id;
    return (
      <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>
  
      <div className="flex flex-col items-center p-4 gap-4 text-center">
        <h2 className="text-3xl font-bold animate-blink">{result.tie ? '🤝 TIE' : won ? '🏆 YOU WIN!' : '💀 YOU LOSE'}</h2>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="border-2 border-neon-cyan p-4">
            <p>YOUR DICE</p>
            <Dice values={amIPlayer1 ? result.dice1 : result.dice2} />
            <p>SUM: {mySum}</p>
          </div>
          <div className="border-2 border-neon-cyan p-4">
            <p>OPPONENT DICE</p>
            <Dice values={amIPlayer1 ? result.dice2 : result.dice1} />
            <p>SUM: {oppSum}</p>
          </div>
        </div>
        <button>on onClick={handleLeaveRoom} className="arcade-btn px-6 py-2"⇦ LOBBY</button>
        <p className="text-sm">Auto return in 10s...</p>
      </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) setUnreadMsgs(0); }}
        className="fixed bottom-4 left-4 border-2 border-neon-cyan bg-neon-black p-2 z-20 hover:bg-neon-cyan hover:text-neon-black transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadMsgs > 0 && (
          <span className="absolute -top-2 -right-2 bg-neon-cyan text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadMsgs}
          </span>
        )}
      </button>

      {/* Game main area */}
      <div className="flex flex-col items-center p-4 gap-6">
  <div className="flex flex-col md:flex-row gap-8 items-center">
    <div className="arcade-card p-6 text-center">
      <p className="text-neon-cyan font-bold">YOUR DICE</p>
      <Dice values={myDice} rolling={myRolling} />
      {currentTurn === user?.id && (
        <button onClick={handleRollClick} className="arcade-btn mt-4 px-8 py-2 text-xl">ROLL</button>
      )}
    </div>
    <div className="relative">
      <CountdownTimer seconds={20} active={currentTurn !== null && timeLeft > 0} />
    </div>
    <div className="arcade-card p-6 text-center">
      <p className="text-neon-cyan font-bold">OPPONENT DICE</p>
      <Dice values={oppDice} rolling={oppRolling} />
    </div>
  </div>
  {!currentTurn && !result && (
    <p className="text-xl arcade-glow font-display">{mode === 'waiting' ? 'WAITING FOR OPPONENT...' : 'READY?'}</p>
  )}
</div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-auto md:w-96 arcade-card z-10 flex flex-col">
          <div className="border-b-4 border-neon-cyan px-4 py-2 flex justify-between items-center">
            <span>💬 GAME CHAT</span>
            <button onClick={() => setChatOpen(false)} className="text-neon-cyan hover:text-neon-cyan">✕</button>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2" ref={chatEndRef}>
            {chatMessages.map((msg, idx) => {
              const isMe = msg.userId === user?.id;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] border-2 p-2 ${isMe ? 'border-neon-gray bg-neon-gray text-neon-black' : 'border-neon-cyan bg-neon-black'}`}>
                    {!isMe && <div className="text-xs font-bold">{msg.username}</div>}
                    <div className="wrap-break-word">{msg.message}</div>
                    <div className="text-[10px] opacity-70 text-left mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex p-2 border-t-2 border-neon-cyan gap-2">
            <input className="neon-input flex-1" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} placeholder="Type message..." />
            <button onClick={sendChatMessage} className="arcade-btn px-3 py-1">SEND</button>
          </div>
        </div>
      )}
    </>
    
  );
}