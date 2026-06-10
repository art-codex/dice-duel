const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// اطمینان از وجود پوشه آپلود
const uploadDir = 'uploads/avatars';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', auth, (req, res) => {
  const user = db.query(`SELECT id, username, avatar, xp, level, coins FROM users WHERE id = ?`, [req.userId])[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.post('/upload-avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  db.run(`UPDATE users SET avatar = ? WHERE id = ?`, [avatarUrl, req.userId]);
  res.json({ avatarUrl });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = db.query('SELECT id, username FROM users WHERE id = ?', [id])[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.get('/user-by-username/:username', (req, res) => {
  const user = db.query('SELECT id, username FROM users WHERE username = ?', [req.params.username])[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Update username
router.post('/update-username', auth, (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) return res.status(400).json({ message: 'Username too short' });
  // بررسی یکتایی
  const existing = db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.userId])[0];
  if (existing) return res.status(400).json({ message: 'Username already taken' });
  db.run('UPDATE users SET username = ? WHERE id = ?', [username, req.userId]);
  res.json({ message: 'Username updated' });
});

module.exports = router;