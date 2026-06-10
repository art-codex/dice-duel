const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const userModel = require('../models/user.model');
const db = require('../config/db');

const router = express.Router();

router.use(auth, admin); // همه مسیرهای زیر نیاز به لاگین و ادمین دارند

// لیست کاربران
router.get('/users', (req, res) => {
  const users = db.query('SELECT id, username, phone, lastName, email, coins, locked, role, createdAt FROM users WHERE id > 0 ORDER BY id DESC');
  res.json(users);
});

// جزئیات یک کاربر
router.get('/users/:id', (req, res) => {
  const user = db.query(`SELECT id, username, phone, lastName, email, coins, locked, role, createdAt, 
                         lastLoginIp, lastLoginDevice, lastLoginAt FROM users WHERE id = ?`, [req.params.id])[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  const txs = db.query('SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', [req.params.id]);
  res.json({ user, transactions: txs });
});

// افزایش/کاهش سکه
router.post('/users/:id/adjust-coins', (req, res) => {
  const { amount, reason } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ message: 'Invalid amount' });
  const amountNum = parseInt(amount);
  if (amountNum === 0) return res.status(400).json({ message: 'Amount cannot be zero' });
  
  const user = userModel.findUserById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  userModel.updateBalance(req.params.id, amountNum);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)', 
    [req.params.id, amountNum, 'ADMIN_ADJUST', reason || `admin_${req.userId}`]);
  res.json({ message: `Coins changed by ${amountNum}`, newCoins: userModel.findUserById(req.params.id).coins });
});

// تغییر نقش کاربر
router.post('/users/:id/change-role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ message: `Role changed to ${role}` });
});

// حذف کاربر (اختیاری - با احتیاط)
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.userId) return res.status(400).json({ message: 'Cannot delete yourself' });
  db.run('DELETE FROM users WHERE id = ?', [userId]);
  db.run('DELETE FROM transactions WHERE userId = ?', [userId]);
  res.json({ message: 'User deleted' });
});

// آمار کلی
router.get('/stats', (req, res) => {
  const totalUsers = db.query('SELECT COUNT(*) as count FROM users WHERE id > 0')[0].count;
  const totalCoins = db.query('SELECT SUM(coins) as sum FROM users WHERE id > 0')[0].sum || 0;
  const totalLocked = db.query('SELECT SUM(locked) as sum FROM users WHERE id > 0')[0].sum || 0;
  const totalGames = db.query('SELECT COUNT(*) as count FROM game_logs')[0].count;
  res.json({ totalUsers, totalCoins, totalLocked, totalGames });
});

// رفع قفل کاربر
router.post('/users/:id/unlock', (req, res) => {
  db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL, is_banned = 0 WHERE id = ?', [req.params.id]);
  res.json({ message: 'User unlocked' });
});

// بن/آنبن
router.post('/users/:id/ban', (req, res) => {
  const { ban } = req.body;
  db.run('UPDATE users SET is_banned = ? WHERE id = ?', [ban ? 1 : 0, req.params.id]);
  res.json({ message: ban ? 'User banned' : 'User unbanned' });
});

// دریافت آخرین پیام‌های چت (برای ادمین)
router.get('/chat-messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const messages = db.query(`
    SELECT id, roomId, userId, username, message, createdAt
    FROM chat_messages
    ORDER BY createdAt DESC
    LIMIT ?
  `, [limit]);
  res.json(messages);
});


module.exports = router;