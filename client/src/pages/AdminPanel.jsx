import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

export default function AdminPanel() {
  const { get, post, del } = useApi();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatMessages, setChatMessages] = useState([]); // پیام‌های چت بازی
  const [supportMessages, setSupportMessages] = useState([]); // پیام‌های پشتیبانی
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  // بررسی نقش ادمین
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/immutability
      loadUsers();
      // eslint-disable-next-line react-hooks/immutability
      loadStats();
      // eslint-disable-next-line react-hooks/immutability
      loadChatMessages();
      // eslint-disable-next-line react-hooks/immutability
      loadSupportMessages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const data = await get('/admin/users');
      setUsers(data);
    } catch (err) { setMessage(err.message); }
  };

  const loadStats = async () => {
    try {
      const data = await get('/admin/stats');
      setStats(data);
    // eslint-disable-next-line no-unused-vars
    } catch (err) { /* ignore */ }
  };

  const loadChatMessages = async () => {
    try {
      const data = await get('/admin/chat-messages');
      setChatMessages(data);
    } catch (err) { console.error(err); }
  };

  const loadSupportMessages = async () => {
    try {
      const data = await get('/support/messages');
      setSupportMessages(data);
    } catch (err) { console.error(err); }
  };

  const loadUserDetails = async (id) => {
    try {
      const data = await get(`/admin/users/${id}`);
      setSelectedUser(data);
    } catch (err) { setMessage(err.message); }
  };

  const handleAdjustCoins = async (userId) => {
    if (!adjustAmount) return;
    try {
      await post(`/admin/users/${userId}/adjust-coins`, { amount: parseInt(adjustAmount), reason });
      setMessage('سکه با موفقیت تغییر کرد');
      setAdjustAmount('');
      setReason('');
      loadUsers();
      if (selectedUser?.user.id === userId) loadUserDetails(userId);
    } catch (err) { setMessage(err.message); }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === 'user' ? 'admin' : 'user';
    try {
      await post(`/admin/users/${userId}/change-role`, { role: newRole });
      setMessage(`نقش کاربر به ${newRole} تغییر کرد`);
      loadUsers();
      if (selectedUser?.user.id === userId) loadUserDetails(userId);
    } catch (err) { setMessage(err.message); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;
    try {
      await del(`/admin/users/${userId}`);
      setMessage('کاربر حذف شد');
      loadUsers();
      if (selectedUser?.user.id === userId) setSelectedUser(null);
    } catch (err) { setMessage(err.message); }
  };

  const sendSupportReply = async (msgId, reply) => {
    if (!reply.trim()) return;
    try {
      await post('/support/reply', { originalMessageId: msgId, reply });
      setMessage('پاسخ ارسال شد');
      loadSupportMessages();
      setReplyText('');
      setReplyingTo(null);
    } catch (err) { setMessage(err.message); }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone && u.phone.includes(searchTerm))
  );

  if (!isAdmin) {
    return <div className="text-center p-8 text-red-500">شما دسترسی به این صفحه ندارید.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* هدر و آمار */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">پنل مدیریت 🛡️</h1>
        <div className="text-sm text-gray-400">
          آمار: {stats.totalUsers} کاربر | {stats.totalCoins || 0} سکه کل | {stats.totalGames} بازی
        </div>
      </div>

      {/* جستجو */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="جستجوی نام کاربری یا شماره تلفن..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-yellow-500"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* لیست کاربران */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-xl font-bold mb-3">👥 کاربران</h2>
          <div className="max-h-125 overflow-y-auto space-y-2">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                onClick={() => loadUserDetails(u.id)}
                className={`p-3 rounded-lg cursor-pointer transition ${selectedUser?.user.id === u.id ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{u.username}</p>
                    <p className="text-xs text-gray-300">{u.phone || 'بدون تلفن'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-300 font-bold">{u.coins} 🎲</p>
                    <p className="text-xs">{u.role === 'admin' ? '👑 ادمین' : '👤 کاربر'}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-center text-gray-400">کاربری یافت نشد</p>}
          </div>
        </div>

        {/* جزئیات کاربر انتخاب شده */}
        {selectedUser && (
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">📋 جزئیات کاربر</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <p><span className="text-gray-400">نام کاربری:</span> {selectedUser.user.username}</p>
              <p><span className="text-gray-400">تلفن:</span> {selectedUser.user.phone || '-'}</p>
              <p><span className="text-gray-400">نام خانوادگی:</span> {selectedUser.user.lastName || '-'}</p>
              <p><span className="text-gray-400">موجودی کل:</span> {selectedUser.user.coins} 🎲</p>
              <p><span className="text-gray-400">قفل شده:</span> {selectedUser.user.locked} 🎲</p>
              <p><span className="text-gray-400">نقش:</span> {selectedUser.user.role === 'admin' ? 'ادمین' : 'کاربر'}</p>
              <p><span className="text-gray-400">آخرین IP:</span> {selectedUser.user.lastLoginIp || '-'}</p>
              <p><span className="text-gray-400">دستگاه/مرورگر:</span> {selectedUser.user.lastLoginDevice || '-'}</p>
              <p><span className="text-gray-400">آخرین ورود:</span> {selectedUser.user.lastLoginAt ? new Date(selectedUser.user.lastLoginAt).toLocaleString('fa-IR') : '-'}</p>
              <p><span className="text-gray-400">تاریخ عضویت:</span> {new Date(selectedUser.user.createdAt).toLocaleString('fa-IR')}</p>

              {/* تنظیم سکه */}
              <div className="border-t border-gray-700 pt-3 mt-2">
                <p className="font-bold mb-2">💰 تغییر موجودی</p>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="مقدار (+/-)"
                    className="p-2 rounded bg-gray-700 w-28 text-center"
                  />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="دلیل (اختیاری)"
                    className="p-2 rounded bg-gray-700 flex-1 text-sm"
                  />
                  <button
                    onClick={() => handleAdjustCoins(selectedUser.user.id)}
                    className="bg-yellow-600 px-4 py-2 rounded hover:bg-yellow-500"
                  >
                    اعمال
                  </button>
                </div>
              </div>

              {/* دکمه‌های مدیریت */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleChangeRole(selectedUser.user.id, selectedUser.user.role)}
                  className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
                >
                  تغییر نقش ({selectedUser.user.role === 'user' ? 'ادمین' : 'کاربر'})
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.user.id)}
                  className="bg-red-700 px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  حذف کاربر
                </button>
              </div>

              {/* تراکنش‌های اخیر */}
              <div className="border-t border-gray-700 pt-3 mt-2">
                <p className="font-bold mb-2">📜 آخرین تراکنش‌ها</p>
                <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                  {selectedUser.transactions.slice(0, 10).map(tx => (
                    <div key={tx.id} className="flex justify-between text-gray-300">
                      <span>{tx.type}</span>
                      <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>{tx.amount}</span>
                      <span className="text-xs">{new Date(tx.createdAt).toLocaleString('fa-IR')}</span>
                    </div>
                  ))}
                  {selectedUser.transactions.length === 0 && <p className="text-gray-500">تراکنشی نیست</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* بخش چت بازی (گفتگوهای داخل اتاق) */}
      <div className="mt-6 bg-gray-800 rounded-xl p-4">
        <h2 className="text-xl font-bold mb-3">💬 آخرین پیام‌های چت بازی</h2>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700 sticky top-0">
              <tr><th className="px-3 py-2 text-right">کاربر</th><th className="px-3 py-2 text-right">اتاق</th><th className="px-3 py-2 text-right">پیام</th><th className="px-3 py-2 text-right">زمان</th></tr>
            </thead>
            <tbody>
              {chatMessages.map(msg => (
                <tr key={msg.id} className="border-t border-gray-700">
                  <td className="px-3 py-2">{msg.username}</td>
                  <td className="px-3 py-2 text-xs">{msg.roomId?.slice(-6)}</td>
                  <td className="px-3 py-2 max-w-md truncate">{msg.message}</td>
                  <td className="px-3 py-2 text-xs">{new Date(msg.createdAt).toLocaleString('fa-IR')}</td>
                </tr>
              ))}
              {chatMessages.length === 0 && <tr><td colSpan="4" className="text-center py-4 text-gray-400">پیامی وجود ندارد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* بخش پشتیبانی (درخواست‌های کاربران و پاسخ ادمین) */}
      <div className="mt-6 bg-gray-800 rounded-xl p-4">
        <h2 className="text-xl font-bold mb-3">🎧 درخواست‌های پشتیبانی</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {supportMessages.map(msg => (
            <div key={msg.id} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between text-sm flex-wrap gap-1">
                <span className="font-bold">{msg.username}</span>
                {msg.phone && <span className="text-yellow-300 text-xs">📞 {msg.phone}</span>}
                <span className="text-gray-400 text-xs">{new Date(msg.createdAt).toLocaleString('fa-IR')}</span>
              </div>
              <p className="mt-1 wrap-break-word">{msg.message}</p>
              {msg.isFromAdmin === 1 && (
                <p className="text-green-400 text-sm mt-1 italic border-t border-gray-600 pt-1">پاسخ ادمین: {msg.message}</p>
              )}
              {!msg.isFromAdmin && (
                <div className="mt-2">
                  {replyingTo === msg.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-gray-600 rounded px-2 py-1 text-sm"
                        placeholder="متن پاسخ..."
                      />
                      <button onClick={() => sendSupportReply(msg.id, replyText)} className="bg-blue-600 px-3 py-1 rounded text-sm">ارسال</button>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-400 text-sm">انصراف</button>
                    </div>
                  ) : (
                    <button onClick={() => setReplyingTo(msg.id)} className="bg-yellow-600 px-3 py-1 rounded text-sm">پاسخ</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {supportMessages.length === 0 && <p className="text-center text-gray-400 py-4">هیچ درخواستی وجود ندارد</p>}
        </div>
      </div>

      {/* نوتیفیکیشن */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-yellow-600 text-yellow-400 p-3 rounded shadow-lg z-50">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-white">&times;</button>
        </div>
      )}
    </div>
  );
}