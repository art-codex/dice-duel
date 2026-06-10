import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function ChatSupport() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // اطلاعات مهمان (برای کاربران غیر لاگین)
  const [guestInfo, setGuestInfo] = useState(() => {
    const saved = localStorage.getItem('support_guest');
    if (saved) return JSON.parse(saved);
    return { name: '', phone: '', guestId: null };
  });
  const [showGuestForm, setShowGuestForm] = useState(!isAuthenticated && (!guestInfo.name || !guestInfo.phone));

  // تولید یک شناسه یکتا برای مهمان (در صورت نداشتن)
  const generateGuestId = () => {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  };

  // ذخیره اطلاعات مهمان
  const saveGuestInfo = (name, phone) => {
    const newGuestId = guestInfo.guestId || generateGuestId();
    const info = { name, phone, guestId: newGuestId };
    localStorage.setItem('support_guest', JSON.stringify(info));
    setGuestInfo(info);
    setShowGuestForm(false);
  };

  // بارگذاری پیام‌ها (با فیلتر سمت کلاینت)
  const loadMessages = async () => {
    try {
      const res = await fetch('/api/support/messages', {
        headers: isAuthenticated ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // فیلتر پیام‌ها بر اساس کاربر فعلی
        let filtered = [];
        if (isAuthenticated && user) {
          filtered = data.filter(msg => msg.userId === user.id || msg.isFromAdmin === 1);
        } else if (guestInfo.guestId) {
          // برای مهمان، پیام‌هایی که username برابر guestInfo.name است یا پاسخ ادمین
          filtered = data.filter(msg => msg.username === guestInfo.name || msg.isFromAdmin === 1);
        } else {
          filtered = []; // هنوز اطلاعات مهمان نداریم
        }
        setMessages(filtered);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load support messages', err);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    hasOpenedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadCount(0);
    loadMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated, user, guestInfo]);

  const sendMessage = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);

    let messageData;
    if (isAuthenticated && user) {
      messageData = {
        userId: user.id,
        username: user.username,
        phone: user.phone || null,
        message: input.trim()
      };
    } else {
      if (!guestInfo.name || !guestInfo.phone) {
        setShowGuestForm(true);
        setIsSubmitting(false);
        return;
      }
      messageData = {
        userId: null,
        username: guestInfo.name,
        phone: guestInfo.phone,
        message: input.trim()
      };
    }

    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      if (res.ok) {
        setInput('');
        await loadMessages(); // بارگذاری مجدد پیام‌ها
      } else {
        console.error('Send failed');
      }
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* دکمه پشتیبانی (هدفون) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full p-3 shadow-lg z-50 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L19.5 6.772M12 3v1m0 16v1m-7.5-6.772L5.636 18.364M5.636 5.636L6.772 6.5M21 12h1M2 12h1M12 21v1M12 3V2M19.5 6.772L17.636 8.636M6.364 17.364L4.5 19.236" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* پنل چت */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-96 bg-gray-800 rounded-xl shadow-xl border border-gray-700 flex flex-col z-50">
          <div className="bg-gray-700 px-4 py-2 rounded-t-xl flex justify-between items-center">
            <span className="font-bold">🎧 پشتیبانی</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">✕</button>
          </div>

          {showGuestForm && !isAuthenticated && (
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <p className="text-sm text-gray-300 mb-2">لطفاً نام و شماره تماس خود را وارد کنید (برای پیگیری):</p>
              <input
                type="text"
                placeholder="نام کامل"
                className="w-full bg-gray-700 rounded-lg px-3 py-1 text-sm mb-2"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
              />
              <input
                type="tel"
                placeholder="شماره تماس"
                className="w-full bg-gray-700 rounded-lg px-3 py-1 text-sm mb-2"
                value={guestInfo.phone}
                onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
              />
              <button
                onClick={() => saveGuestInfo(guestInfo.name, guestInfo.phone)}
                disabled={!guestInfo.name || !guestInfo.phone}
                className="w-full bg-yellow-600 disabled:bg-gray-600 rounded-lg py-1 text-sm"
              >
                تایید و شروع مکالمه
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">هنوز پیامی وجود ندارد</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`text-sm ${msg.isFromAdmin ? 'bg-blue-900' : 'bg-gray-700'} p-2 rounded-lg`}>
                  <span className="font-bold text-yellow-400">
                    {msg.isFromAdmin ? 'پشتیبانی: ' : (msg.username || 'کاربر') + ': '}
                  </span>
                  <span className="text-cyan-200 wrap-break-word">{msg.message}</span>
                  <div className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-cyan p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-sm"
            />
            <button onClick={sendMessage} disabled={isSubmitting} className="bg-yellow-600 px-3 py-1 rounded-lg text-sm">
              ارسال
            </button>
          </div>
        </div>
      )}
    </>
  );
}