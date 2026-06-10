const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const router = express.Router();

// دریافت همه پیام‌ها (برای ادمین)
router.get('/messages', auth, (req, res) => {
  const user = db.query('SELECT role FROM users WHERE id = ?', [req.userId])[0];
  if (!user || user.role !== 'admin') {
    // کاربر عادی فقط پیام‌های عمومی را می‌بیند (اختیاری)
    const messages = db.query('SELECT * FROM support_messages ORDER BY createdAt ASC LIMIT 100');
    return res.json(messages);
  }
  const messages = db.query('SELECT * FROM support_messages ORDER BY createdAt ASC LIMIT 100');
  res.json(messages);
});

// ارسال پیام جدید (عمومی)
router.post('/message', (req, res) => {
  const { userId, username, phone, message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Message cannot be empty' });
  }
  const finalUserId = userId || null;
  const finalUsername = username || 'مهمان';
  const finalPhone = phone || null;
  db.run(
    'INSERT INTO support_messages (userId, username, phone, message, isFromAdmin) VALUES (?, ?, ?, ?, ?)',
    [finalUserId, finalUsername, finalPhone, message.trim(), 0]
  );
  res.json({ message: 'Message sent to support' });
});

// پاسخ ادمین (فقط ادمین)
router.post('/reply', auth, (req, res) => {
  const { originalMessageId, reply } = req.body;
  const user = db.query('SELECT role, username FROM users WHERE id = ?', [req.userId])[0];
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  if (!reply || reply.trim() === '') {
    return res.status(400).json({ message: 'Reply cannot be empty' });
  }
  db.run(
    'INSERT INTO support_messages (userId, username, message, isFromAdmin) VALUES (?, ?, ?, ?)',
    [req.userId, user.username, reply.trim(), 1]
  );
  res.json({ message: 'Reply sent' });
});

module.exports = router;