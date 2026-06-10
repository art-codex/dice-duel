const db = require('../config/db');

module.exports = function setupPrivateChat(io) {
  const privateNamespace = io.of('/private-chat');
  
  privateNamespace.use((socket, next) => {
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

  privateNamespace.on('connection', (socket) => {
    console.log(`🔒 Private chat connected: ${socket.username} (${socket.userId})`);
    socket.join(`private_${socket.userId}`);

    // ---------- دریافت لیست مکالمات ----------
    socket.on('private:get-conversations', (callback) => {
      if (typeof callback !== 'function') {
        console.warn('callback missing');
        return;
      }
      const userId = socket.userId;
      try {
        const conversations = db.query(`
          SELECT 
            u.id, u.username,
            (
              SELECT message FROM private_messages 
              WHERE (fromUserId = ? AND toUserId = u.id) OR (fromUserId = u.id AND toUserId = ?)
              ORDER BY createdAt DESC LIMIT 1
            ) as lastMessage,
            (
              SELECT createdAt FROM private_messages 
              WHERE (fromUserId = ? AND toUserId = u.id) OR (fromUserId = u.id AND toUserId = ?)
              ORDER BY createdAt DESC LIMIT 1
            ) as lastTime,
            (
              SELECT COUNT(*) FROM private_messages 
              WHERE fromUserId = u.id AND toUserId = ? AND isRead = 0
            ) as unreadCount
          FROM users u
          WHERE EXISTS (
            SELECT 1 FROM private_messages 
            WHERE (fromUserId = ? AND toUserId = u.id) OR (fromUserId = u.id AND toUserId = ?)
          )
          ORDER BY lastTime DESC
        `, [userId, userId, userId, userId, userId, userId, userId]);
        console.log(`📋 Loaded ${conversations.length} conversations for user ${userId}`);
        callback(conversations);
      } catch (err) {
        console.error('[privateChat] get-conversations error:', err);
        callback([]);
      }
    });

    // ---------- دریافت تاریخچه پیام‌ها با یک کاربر خاص ----------
    socket.on('private:history', ({ targetUserId }, callback) => {
      console.log(`📜 History requested: user ${socket.userId} with ${targetUserId}`);
      const messages = db.query(
        `SELECT id, fromUserId, toUserId, message, createdAt, isRead
         FROM private_messages
         WHERE (fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)
         ORDER BY createdAt ASC LIMIT 100`,
        [socket.userId, targetUserId, targetUserId, socket.userId]
      );
      console.log(`Found ${messages.length} messages`);
      callback(messages);
    });

    // ---------- ارسال پیام خصوصی ----------
    socket.on('private:send', ({ toUserId, message }) => {
      if (!message || message.trim() === '') return;
      const fromUserId = socket.userId;
      console.log(`💬 Sending private msg from ${fromUserId} to ${toUserId}: ${message}`);
      db.run(
        `INSERT INTO private_messages (fromUserId, toUserId, message, status, createdAt)
         VALUES (?, ?, ?, 'sent', datetime('now'))`,
        [fromUserId, toUserId, message.trim()]
      );
      const newId = db.getLastInsertId();
      console.log(`Saved with id ${newId}`);
      const newMsg = {
        id: newId,
        fromUserId,
        toUserId,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        isRead: 0,
        status: 'sent'
      };
      privateNamespace.to(`private_${toUserId}`).emit('private:new-message', newMsg);
      privateNamespace.to(`private_${fromUserId}`).emit('private:new-message', newMsg);
    });

    // ---------- علامت زدن پیام‌ها به عنوان مطالعه شده ----------
    socket.on('private:mark-read', ({ targetUserId }) => {
      db.run(
        `UPDATE private_messages SET isRead = 1, status = 'read'
         WHERE fromUserId = ? AND toUserId = ? AND isRead = 0`,
        [targetUserId, socket.userId]
      );
      privateNamespace.to(`private_${targetUserId}`).emit('private:read-receipt', {
        byUserId: socket.userId,
        forUserId: targetUserId
      });
    });
  });
};