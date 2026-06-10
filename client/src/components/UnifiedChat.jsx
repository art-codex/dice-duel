/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

export default function UnifiedChat({ isOpen, onClose }) {
  const { token, isAuthenticated, user } = useAuth();
  // حذف state محلی isOpen – فقط از props استفاده شود
  const [activeTab, setActiveTab] = useState('global');
  const [globalMessages, setGlobalMessages] = useState([]);
  const [privateChatsMap, setPrivateChatsMap] = useState(() => new Map());
  const [currentPrivateTarget, setCurrentPrivateTarget] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unreadPrivate, setUnreadPrivate] = useState({});
  const [showPrivateList, setShowPrivateList] = useState(true);
  const messagesEndRef = useRef(null);
  const globalSocket = useRef(null);
  const privateSocket = useRef(null);
  const currentPrivateTargetRef = useRef(null);
  const resizeRef = useRef(null);
  const [chatHeight, setChatHeight] = useState(550);
  // eslint-disable-next-line no-unused-vars
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    currentPrivateTargetRef.current = currentPrivateTarget;
  }, [currentPrivateTarget]);

  useEffect(() => {
    if (!isOpen) return;
    const defaultHeight = window.innerWidth < 768 ? 500 : 550;
    setChatHeight(defaultHeight);
  }, [isOpen]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = chatHeight;
    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      let newHeight = startHeight + delta;
      const minHeight = 300;
      const maxHeight = window.innerHeight * 0.8;
      newHeight = Math.min(maxHeight, Math.max(minHeight, newHeight));
      setChatHeight(newHeight);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const privateChats = Array.from(privateChatsMap.values()).sort(
    (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
  );

  // ========== Global Socket ==========
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = io('/global-chat', { auth: { token }, path: '/socket.io' });
    globalSocket.current = socket;
    socket.on('connect', () => console.log('🌐 Global chat connected'));
    socket.on('global:history', (history) => setGlobalMessages(history));
    socket.on('global:new-message', (msg) => setGlobalMessages(prev => [...prev, msg]));
    return () => socket.disconnect();
  }, [isAuthenticated, token]);

  // ========== Private Socket ==========
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = io('/private-chat', { auth: { token }, path: '/socket.io' });
    privateSocket.current = socket;

    const onConnect = () => {
      console.log('🔒 Private chat connected');
      socket.emit('private:get-conversations', (conversations) => {
        if (!conversations || !Array.isArray(conversations)) return;
        const newMap = new Map();
        conversations.forEach(conv => {
          newMap.set(conv.id, {
            user: { id: conv.id, username: conv.username },
            lastMessage: conv.lastMessage,
            lastTime: conv.lastTime,
            lastMessageStatus: 'sent',
          });
          if (conv.unreadCount > 0) {
            setUnreadPrivate(prev => ({ ...prev, [conv.id]: conv.unreadCount }));
          }
        });
        setPrivateChatsMap(newMap);
      });
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', (err) => console.error('Private chat connect error:', err.message));

    socket.on('private:new-message', (msg) => {
      const fromId = Number(msg.fromUserId);
      const toId = Number(msg.toUserId);
      const target = currentPrivateTargetRef.current;
      const targetId = target ? Number(target.id) : null;

      if (fromId !== user?.id) {
        setUnreadPrivate(prev => ({
          ...prev,
          [fromId]: (prev[fromId] || 0) + 1,
        }));
      }

      setPrivateChatsMap(prev => {
        const newMap = new Map(prev);
        const otherUserId = fromId === user?.id ? toId : fromId;
        const existing = newMap.get(otherUserId);
        if (existing) {
          newMap.set(otherUserId, {
            ...existing,
            lastMessage: msg.message,
            lastTime: msg.createdAt,
            lastMessageStatus: msg.status || 'sent'
          });
        } else {
          fetch(`/api/users/${otherUserId}`)
            .then(res => res.json())
            .then(userData => {
              if (userData.id === user?.id) return;
              setPrivateChatsMap(prev2 => {
                const m = new Map(prev2);
                if (!m.has(userData.id)) {
                  m.set(userData.id, {
                    user: userData,
                    lastMessage: msg.message,
                    lastTime: msg.createdAt,
                    lastMessageStatus: msg.status || 'sent'
                  });
                }
                return m;
              });
            })
            .catch(console.error);
        }
        return newMap;
      });

      if (targetId !== null && (targetId === fromId || targetId === toId)) {
        setPrivateMessages(prev => {
          const filtered = prev.filter(pMsg => {
            if (typeof pMsg.id === 'string' && pMsg.id.startsWith('temp-')) {
              const timeDiff = Math.abs(new Date(pMsg.createdAt) - new Date(msg.createdAt));
              if (pMsg.message === msg.message && timeDiff < 3000) return false;
            }
            return true;
          });
          return [...filtered, msg];
        });
      }
    });

    socket.on('private:read-receipt', ({ byUserId }) => {
      const byId = Number(byUserId);
      setPrivateChatsMap(prev => {
        const m = new Map(prev);
        const chat = m.get(byId);
        if (chat) m.set(byId, { ...chat, lastMessageStatus: 'read' });
        return m;
      });
      const target = currentPrivateTargetRef.current;
      if (target && Number(target.id) === byId) {
        setPrivateMessages(prev => prev.map(msg =>
          msg.fromUserId === user?.id && Number(msg.toUserId) === byId
            ? { ...msg, isRead: true, status: 'read' }
            : msg
        ));
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, [isAuthenticated, token, user?.id]);

  // ========== باز کردن چت خصوصی ==========
  const openPrivateChat = useCallback((targetUser) => {
    setCurrentPrivateTarget(targetUser);
    if (privateSocket.current && privateSocket.current.connected) {
      privateSocket.current.emit('private:history', { targetUserId: targetUser.id }, (msgs) => {
        setPrivateMessages(msgs || []);
      });
      privateSocket.current.emit('private:mark-read', { targetUserId: targetUser.id });
    }
    setUnreadPrivate(prev => ({ ...prev, [targetUser.id]: 0 }));
    setActiveTab('private');
    setShowPrivateList(false);
  }, []);

  const backToPrivateList = () => {
    setShowPrivateList(true);
    setCurrentPrivateTarget(null);
    setPrivateMessages([]);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    if (activeTab === 'global' && globalSocket.current) {
      globalSocket.current.emit('global:message', { message: input.trim() });
    } else if (activeTab === 'private' && currentPrivateTarget && privateSocket.current) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempMsg = {
        id: tempId,
        fromUserId: user?.id,
        toUserId: currentPrivateTarget.id,
        message: input.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
        status: 'sent'
      };
      setPrivateMessages(prev => [...prev, tempMsg]);
      privateSocket.current.emit('private:send', {
        toUserId: currentPrivateTarget.id,
        message: input.trim()
      });
    }
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, privateMessages]);

  if (!isAuthenticated) return null;

  const renderMessageStatus = (msg) => {
    if (msg.fromUserId !== user?.id) return null;
    if (msg.isRead) return <span className="text-[10px] text-blue-400 ml-1">✓✓</span>;
    return <span className="text-[10px] text-gray-400 ml-1">✓</span>;
  };

  // ========== JSX (بدون دکمه فلوتینگ و با استفاده از props.isOpen / props.onClose) ==========
  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 left-4 md:left-auto md:right-6 md:w-[450px] bg-gray-900/95 backdrop-blur-md rounded-2xl flex flex-col z-50 shadow-2xl border border-cyan-400/50 overflow-hidden"
          style={{ height: `${chatHeight}px` }}
        >
          {/* نوار کشویی برای تنظیم ارتفاع */}
          <div
            ref={resizeRef}
            onMouseDown={startResize}
            className="h-2 w-full cursor-ns-resize bg-gray-700 hover:bg-cyan-400 transition-colors rounded-t-2xl"
            style={{ touchAction: 'none' }}
          />

          {/* هدر تب‌ها */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 flex justify-between items-center border-b border-cyan-400/30">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('global');
                  setShowPrivateList(true);
                  setCurrentPrivateTarget(null);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'global' ? 'bg-cyan-400 text-black shadow-[0_0_8px_#00ffff]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                🌍 عمومی
              </button>
              <button
                onClick={() => {
                  setActiveTab('private');
                  setShowPrivateList(true);
                  setCurrentPrivateTarget(null);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'private' ? 'bg-cyan-400 text-black shadow-[0_0_8px_#00ffff]' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                🔒 خصوصی
              </button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-5">&times;</button>
          </div>

          {/* محتوای تب‌ها */}
          <div className="flex-1 overflow-hidden bg-black/30">
            {activeTab === 'global' ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {globalMessages.map((msg) => {
                    const isMe = msg.userId === user?.id;
                    return (
                      <div key={msg.id || `${msg.createdAt}-${msg.userId}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-md ${isMe ? 'bg-cyan-400 text-black rounded-bl-none' : 'bg-gray-800 text-gray-200 rounded-br-none border border-gray-700'}`}>
                          {!isMe && (
                            <div
                              className="text-xs font-bold text-cyan-400 cursor-pointer hover:underline mb-1"
                              onClick={() => {
                                fetch(`/api/users/user-by-username/${msg.username}`)
                                  .then(res => res.json())
                                  .then(userData => openPrivateChat(userData))
                                  .catch(console.error);
                              }}
                            >
                              {msg.username}
                            </div>
                          )}
                          <div className="text-sm break-words whitespace-normal leading-relaxed">{msg.message}</div>
                          <div className="text-[10px] opacity-70 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-gray-700 flex gap-2 bg-gray-900/80">
                  <input
                    className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="پیام عمومی..."
                  />
                  <button onClick={sendMessage} className="bg-cyan-400 hover:bg-purple-500 text-black rounded-full px-5 py-2 text-sm font-bold transition-colors">
                    ارسال
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full">
                {showPrivateList ? (
                  <div className="overflow-y-auto h-full p-2 space-y-1">
                    {privateChats.length === 0 ? (
                      <div className="text-center text-gray-400 p-8">هیچ گفتگوی خصوصی ندارید</div>
                    ) : (
                      privateChats.map((chat) => (
                        <div
                          key={chat.user.id}
                          onClick={() => openPrivateChat(chat.user)}
                          className="p-3 hover:bg-gray-800/60 cursor-pointer rounded-xl transition flex items-center justify-between border-b border-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center text-black font-bold">
                              {chat.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-white">{chat.user.username}</div>
                              <div className="text-xs text-gray-400 truncate max-w-[150px]">{chat.lastMessage}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {unreadPrivate[chat.user.id] > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {unreadPrivate[chat.user.id]}
                              </span>
                            )}
                            <div className="text-xs">
                              {chat.lastMessageStatus === 'read' && <span className="text-blue-400">✓✓</span>}
                              {chat.lastMessageStatus === 'sent' && <span className="text-gray-400">✓</span>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="bg-gray-800/80 p-3 flex items-center gap-3 border-b border-gray-700">
                      <button onClick={backToPrivateList} className="text-cyan-400 hover:text-white text-xl leading-5">←</button>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center text-black font-bold">
                          {currentPrivateTarget?.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{currentPrivateTarget?.username}</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {privateMessages.map((msg, idx) => {
                        const isMe = msg.fromUserId === user?.id;
                        return (
                          <div key={msg.id || `temp-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-md ${isMe ? 'bg-cyan-400 text-black rounded-bl-none' : 'bg-gray-800 text-gray-200 rounded-br-none border border-gray-700'}`}>
                              <div className="text-sm break-words whitespace-normal leading-relaxed">{msg.message}</div>
                              <div className="text-[10px] opacity-70 mt-1 flex justify-end items-center gap-1">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {renderMessageStatus(msg)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t border-gray-700 flex gap-2 bg-gray-900/80">
                      <input
                        className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="پیام خصوصی..."
                      />
                      <button onClick={sendMessage} className="bg-cyan-400 hover:bg-purple-500 text-black rounded-full px-5 py-2 text-sm font-bold transition-colors">
                        ارسال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}