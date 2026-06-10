/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

export default function GlobalChat() {
  const { token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = io('/global-chat', {
      auth: { token },
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Global chat connected'));
    socket.on('global:history', (history) => {
      setMessages(history);
    });
    socket.on('global:new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!isOpen && !hasOpenedRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => socket.disconnect();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('global:message', { message: input.trim() });
    setInput('');
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 bg-neon-cyan text-black rounded-full p-2 shadow-lg z-50"
      >
        🌐
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-4 w-80 h-96 bg-gray-800 border border-neon-cyan rounded-xl flex flex-col z-50 shadow-xl">
          <div className="p-2 bg-gray-700 rounded-t-xl flex justify-between items-center">
            <span className="font-bold">🌍 Global Chat</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {messages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="font-bold text-neon-cyan">{msg.username}:</span> {msg.message}
                <div className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 border-t border-gray-700 flex gap-1">
            <input
              className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type message..."
            />
            <button onClick={sendMessage} className="bg-neon-cyan px-3 py-1 rounded text-sm">Send</button>
          </div>
        </div>
      )}
    </>
  );
}