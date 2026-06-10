const roomService = require('../services/roomService');
const coinService = require('../services/coinService');
const gameService = require('../services/gameService');
const userModel = require('../models/user.model');

module.exports = function gameHandler(io, socket) {
  socket.currentRoomId = null;

  socket.on('room:create', (data, callback) => {
    try {
      const bet = Number(data.bet);
      if (![10, 25, 50, 100, 250, 500].includes(bet) && (bet < 10 || bet > 1000)) {
        return callback({ success: false, message: 'شرط نامعتبر' });
      }
      coinService.lockCoins(socket.userId, bet);
      const roomId = roomService.createRoom(socket.userId, bet);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      callback({ success: true, roomId });
      io.emit('lobby:rooms', roomService.getOpenRooms());
      console.log(`🆕 Room created: ${roomId} by user ${socket.userId}, bet=${bet}`);

      // تایمر 60 ثانیه برای ورود خودکار ربات
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Checking room ${roomId} for auto-bot...`);
        if (roomService.isRoomWaiting(roomId)) {
          console.log(`🤖 Auto-adding bot to room ${roomId}`);
          joinBotToRoom(io, roomId);
        } else {
          console.log(`❌ Room ${roomId} is not waiting, skipping bot.`);
        }
      }, 60000);
      roomService.setBotTimeout(roomId, timeoutId);
    } catch (err) {
      console.error('[room:create] error:', err);
      callback({ success: false, message: err.message });
    }
  });

  socket.on('room:join', (data, callback) => {
    try {
      const { roomId } = data;
      const room = roomService.getRoom(roomId);
      if (!room) throw new Error('Room not found');
      coinService.lockCoins(socket.userId, room.bet);
      roomService.joinRoom(roomId, socket.userId);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      roomService.clearBotTimeout(roomId); // ربات دیگر نیازی نیست
      callback({ success: true });
      io.emit('lobby:rooms', roomService.getOpenRooms());
      console.log(`👥 User ${socket.userId} joined room ${roomId}`);
      setTimeout(() => {
        const updatedRoom = roomService.getRoom(roomId);
        if (updatedRoom && updatedRoom.status === 'playing') {
          startTurn(io, roomId, updatedRoom.players[0]);
        }
      }, 500);
    } catch (err) {
      console.error('[room:join] error:', err);
      callback({ success: false, message: err.message });
    }
  });

  socket.on('chat:message', (data) => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;
    const room = roomService.getRoom(roomId);
    if (!room) return;
    const message = data.message?.trim().substring(0, 500);
    if (!message) return;
    const db = require('../config/db');
    db.run(
      'INSERT INTO chat_messages (roomId, userId, username, message, createdAt) VALUES (?, ?, ?, ?, datetime("now"))',
      [roomId, socket.userId, socket.username, message]
    );
    io.to(roomId).emit('chat:message', {
      userId: socket.userId,
      username: socket.username,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('game:roll', () => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    if (room.currentTurn === socket.userId && !room.diceResults[socket.userId]) {
      clearTimeout(room.rollTimer);
      const dice = gameService.rollForPlayer(socket.userId, room);
      io.to(roomId).emit('game:roll_result', { playerId: socket.userId, dice });
      advanceTurn(io, roomId);
    }
  });


socket.on('invite:send', ({ targetUserId, bet }, callback) => {
  const inviterId = socket.userId;
  const inviterName = socket.username;
  const roomId = roomService.createRoom(inviterId, bet);
  socket.join(roomId);
  socket.currentRoomId = roomId;
  // ذخیره موقت اطلاعات دعوت (اختیاری)
  io.to(`user_${targetUserId}`).emit('invite:received', {
    fromUserId: inviterId,
    fromUsername: inviterName,
    bet,
    roomId,
  });
  if (callback) callback({ success: true });
});

socket.on('invite:accept', ({ inviterId, roomId }) => {
  console.log(`📨 [invite:accept] from user ${socket.userId} for room ${roomId}, inviter=${inviterId}`);
  try {
    const invitedId = socket.userId;
    roomService.joinRoom(roomId, invitedId);
    socket.join(roomId);
    socket.currentRoomId = roomId;
    // ارسال به فرستنده دعوت (از طریق روم اختصاصی او)
    io.to(`user_${inviterId}`).emit('invite:accepted', { roomId });
    const room = roomService.getRoom(roomId);
    if (room && room.status === 'playing') {
      startTurn(io, roomId, room.players[0]);
    }
    console.log(`✅ Invite accepted. Inviter ${inviterId} notified, game started.`);
  } catch (err) {
    console.error('❌ Accept invite error:', err.message);
    socket.emit('game:error', { message: err.message });
  }
});


  socket.on('room:leave', (roomId) => {
    const room = roomService.getRoom(roomId);
    if (room && room.status === 'waiting' && room.players[0] === socket.userId) {
      coinService.unlockCoins(socket.userId, room.bet);
      roomService.deleteRoom(roomId);
      io.emit('lobby:rooms', roomService.getOpenRooms());
    }
    socket.leave(roomId);
    if (socket.currentRoomId === roomId) socket.currentRoomId = null;
  });

  socket.on('lobby:get_rooms', () => {
    socket.emit('lobby:rooms', roomService.getOpenRooms());
  });

  // ========== INVITE SYSTEM ==========
socket.on('invite:send', ({ targetUserId, bet }, callback) => {
  console.log(`📨 [invite:send] from user ${socket.userId} to user ${targetUserId}, bet=${bet}`);
  if (!targetUserId || !bet) {
    console.log('❌ Invalid invite data');
    if (callback) callback({ error: 'Invalid data' });
    return;
  }
  const inviterId = socket.userId;
  const inviterName = socket.username;
  try {
    // ایجاد اتاق بازی
    const roomId = roomService.createRoom(inviterId, bet);
    socket.join(roomId);
    socket.currentRoomId = roomId;
    // ارسال به کاربر هدف (از طریق روم اختصاصی او)
    io.to(`user_${targetUserId}`).emit('invite:received', {
      fromUserId: inviterId,
      fromUsername: inviterName,
      bet,
      roomId,
    });
    console.log(`✅ Invite sent to user ${targetUserId} (room: ${roomId})`);
    if (callback) callback({ success: true, roomId });
  } catch (err) {
    console.error('❌ Invite error:', err.message);
    if (callback) callback({ error: err.message });
  }
});

socket.on('invite:accept', ({ inviterId, roomId }) => {
  console.log(`📨 [invite:accept] from user ${socket.userId} for room ${roomId}`);
  try {
    const invitedId = socket.userId;
    roomService.joinRoom(roomId, invitedId);
    socket.join(roomId);
    socket.currentRoomId = roomId;
    io.to(`user_${inviterId}`).emit('invite:accepted', { roomId });
    const room = roomService.getRoom(roomId);
    if (room && room.status === 'playing') {
      startTurn(io, roomId, room.players[0]);
    }
    console.log(`✅ User ${invitedId} accepted invite, game started`);
  } catch (err) {
    console.error('❌ Accept invite error:', err.message);
    socket.emit('game:error', { message: err.message });
  }
});


  socket.on('disconnect', () => {
    if (socket.currentRoomId) {
      const room = roomService.getRoom(socket.currentRoomId);
      if (room && room.status === 'waiting' && room.players[0] === socket.userId) {
        setTimeout(() => {
          const stillRoom = roomService.getRoom(socket.currentRoomId);
          if (stillRoom && stillRoom.status === 'waiting') {
            coinService.unlockCoins(socket.userId, room.bet);
            roomService.deleteRoom(socket.currentRoomId);
            io.emit('lobby:rooms', roomService.getOpenRooms());
          }
        }, 60000);
      }
    }
  });

  // ========== توابع کمکی برای ربات ==========

  function joinBotToRoom(io, roomId) {
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'waiting') return;

    // اطمینان از وجود ربات در دیتابیس (id=-1)
    try {
      coinService.lockCoins(-1, room.bet);
    } catch (err) {
      console.error('Failed to lock coins for bot:', err);
      return;
    }
    room.players.push(-1);
    room.status = 'playing';
    room.isBotGame = true;
    room.currentTurn = room.players[0];
    roomService.clearBotTimeout(roomId);
    io.emit('lobby:rooms', roomService.getOpenRooms());
    io.to(roomId).emit('game:your_turn', { playerId: room.currentTurn });
    console.log(`🤖 Bot joined room ${roomId}, currentTurn=${room.currentTurn}`);

    if (room.rollTimer) clearTimeout(room.rollTimer);
    room.rollTimer = setTimeout(() => {
      const currentRoom = roomService.getRoom(roomId);
      if (currentRoom && currentRoom.currentTurn === room.currentTurn && !currentRoom.diceResults[room.currentTurn]) {
        const dice = gameService.rollForPlayer(room.currentTurn, currentRoom);
        io.to(roomId).emit('game:roll_result', { playerId: room.currentTurn, dice });
        advanceTurnForBot(io, roomId);
      }
    }, 20000);
  }

  function advanceTurnForBot(io, roomId) {
    const room = roomService.getRoom(roomId);
    if (!room) return;
    const allRolled = room.players.every(p => room.diceResults[p]);
    if (allRolled) {
      const result = gameService.determineWinner(room);
      io.to(roomId).emit('game:result', result);
      roomService.deleteRoom(roomId);
      io.emit('lobby:rooms', roomService.getOpenRooms());
      return;
    }
    const nextPlayer = room.players.find(p => !room.diceResults[p]);
    room.currentTurn = nextPlayer;
    io.to(roomId).emit('game:your_turn', { playerId: nextPlayer });
    const delay = (nextPlayer === -1) ? 1000 : 20000;
    room.rollTimer = setTimeout(() => {
      const currentRoom = roomService.getRoom(roomId);
      if (currentRoom && currentRoom.currentTurn === nextPlayer && !currentRoom.diceResults[nextPlayer]) {
        const dice = gameService.rollForPlayer(nextPlayer, currentRoom);
        io.to(roomId).emit('game:roll_result', { playerId: nextPlayer, dice });
        advanceTurnForBot(io, roomId);
      }
    }, delay);
  }

  // ========== توابع کمکی برای بازی معمولی ==========

  function startTurn(io, roomId, playerId) {
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    room.currentTurn = playerId;
    if (playerId !== -1) {
      io.to(roomId).emit('game:your_turn', { playerId });
    }
    if (room.rollTimer) clearTimeout(room.rollTimer);
    const delay = playerId === -1 ? 1000 : 20000;
    room.rollTimer = setTimeout(() => {
      const currentRoom = roomService.getRoom(roomId);
      if (currentRoom && currentRoom.currentTurn === playerId && !currentRoom.diceResults[playerId]) {
        const dice = gameService.rollForPlayer(playerId, currentRoom);
        io.to(roomId).emit('game:roll_result', { playerId, dice });
        advanceTurn(io, roomId);
      }
    }, delay);
  }

  function advanceTurn(io, roomId) {
    const room = roomService.getRoom(roomId);
    if (!room) return;
    const allRolled = room.players.every(p => room.diceResults[p]);
    if (allRolled) {
      const result = gameService.determineWinner(room);
      io.to(roomId).emit('game:result', result);
      roomService.deleteRoom(roomId);
      io.emit('lobby:rooms', roomService.getOpenRooms());
    } else {
      const nextPlayer = room.players.find(p => !room.diceResults[p]);
      startTurn(io, roomId, nextPlayer);
    }
  }
};