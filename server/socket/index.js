const socketIo = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const userModel = require('../models/user.model');
const gameHandler = require('./gameHandler');
const setupGlobalChat = require('./globalChat');
const setupPrivateChat = require('./privateChat');

function setupSocket(server) {
  const io = socketIo(server, {
    cors: { origin: true, methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = verifyToken(token);
      const user = userModel.findUserById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.userId = decoded.userId;
      socket.username = user.username;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user_${socket.userId}`);
    console.log(`User ${socket.userId} (${socket.username}) connected`);
    gameHandler(io, socket);
  });

  setupGlobalChat(io);
  setupPrivateChat(io);

  return io;
}

module.exports = setupSocket;