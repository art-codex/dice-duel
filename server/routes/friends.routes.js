const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const router = express.Router();

// جستجوی کاربران
router.get('/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const users = db.query(`
    SELECT id, username, avatar, level 
    FROM users 
    WHERE username LIKE ? AND id != ? 
    LIMIT 10
  `, [`%${q}%`, req.userId]);
  res.json(users);
});

// ارسال درخواست دوستی
router.post('/request', auth, (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ message: 'targetUserId required' });
  const targetId = parseInt(targetUserId);
  if (isNaN(targetId)) return res.status(400).json({ message: 'targetUserId must be a number' });
  if (targetId === req.userId) return res.status(400).json({ message: 'Cannot add yourself' });
  
  // بررسی وجود درخواست قبلی
  const existing = db.query(`
    SELECT * FROM friend_requests 
    WHERE (fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)
  `, [req.userId, targetId, targetId, req.userId]);
  if (existing.length > 0) {
    return res.status(400).json({ message: 'Request already sent or pending' });
  }
  db.run(`
    INSERT INTO friend_requests (fromUserId, toUserId, status) VALUES (?, ?, 'pending')
  `, [req.userId, targetId]);
  res.json({ message: 'Friend request sent' });
});

// دریافت درخواست‌های دریافتی
router.get('/requests', auth, (req, res) => {
  const requests = db.query(`
    SELECT u.id, u.username, u.avatar, u.level, r.id as requestId, r.createdAt
    FROM friend_requests r
    JOIN users u ON r.fromUserId = u.id
    WHERE r.toUserId = ? AND r.status = 'pending'
  `, [req.userId]);
  res.json(requests);
});

// پذیرش درخواست
router.post('/accept', auth, (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ message: 'requestId required' });
  const request = db.query(`SELECT * FROM friend_requests WHERE id = ? AND toUserId = ? AND status = 'pending'`, [requestId, req.userId])[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  db.run(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`, [requestId]);
  res.json({ message: 'Friend added' });
});

// رد درخواست
router.post('/reject', auth, (req, res) => {
  const { requestId } = req.body;
  db.run(`DELETE FROM friend_requests WHERE id = ? AND toUserId = ?`, [requestId, req.userId]);
  res.json({ message: 'Request rejected' });
});

// حذف دوست
router.delete('/:friendId', auth, (req, res) => {
  const friendId = parseInt(req.params.friendId);
  db.run(`
    DELETE FROM friend_requests 
    WHERE (fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)
  `, [req.userId, friendId, friendId, req.userId]);
  res.json({ message: 'Friend removed' });
});

// لیست دوستان
router.get('/', auth, (req, res) => {
  const friends = db.query(`
    SELECT 
      u.id, u.username, u.avatar, u.level,
      (SELECT message FROM private_messages 
       WHERE (fromUserId = ? AND toUserId = u.id) OR (fromUserId = u.id AND toUserId = ?)
       ORDER BY createdAt DESC LIMIT 1) as lastMessage,
      (SELECT createdAt FROM private_messages 
       WHERE (fromUserId = ? AND toUserId = u.id) OR (fromUserId = u.id AND toUserId = ?)
       ORDER BY createdAt DESC LIMIT 1) as lastTime
    FROM friend_requests f
    JOIN users u ON (f.fromUserId = u.id OR f.toUserId = u.id)
    WHERE (f.fromUserId = ? OR f.toUserId = ?) 
      AND f.status = 'accepted' 
      AND u.id != ?
  `, [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId]);
  res.json(friends);
});

module.exports = router;