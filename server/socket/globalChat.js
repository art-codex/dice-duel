const db = require('../config/db');

module.exports = function setupGlobalChat(io) {
  const globalNamespace = io.of('/global-chat');

  globalNamespace.use((socket, next) => {
    // احراز هویت از طریق middleware اصلی به ارث نمی‌رسد، پس دوباره توکن چک می‌شود
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.query('SELECT id, username FROM users WHERE id = ?', [decoded.userId])[0];
      if (!user) return next(new Error('User not found'));
      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  globalNamespace.on('connection', (socket) => {
    console.log(`Global chat connected: ${socket.username} (${socket.userId})`);

    // ارسال 50 پیام آخر به کاربر
    const recent = db.query(
      `SELECT id, userId, username, message, createdAt 
       FROM global_messages 
       ORDER BY createdAt DESC LIMIT 50`
    );
    socket.emit('global:history', recent.reverse());

    // دریافت پیام جدید از کاربر
    socket.on('global:message', (data) => {
      const message = data.message?.trim();
      if (!message || message.length > 500) return;
      db.run(
        'INSERT INTO global_messages (userId, username, message, createdAt) VALUES (?, ?, ?, datetime("now"))',
        [socket.userId, socket.username, message]
      );
      const newMsg = {
        userId: socket.userId,
        username: socket.username,
        message,
        createdAt: new Date().toISOString(),
      };
      globalNamespace.emit('global:new-message', newMsg);
    });
  });
};