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
        return callback({ success: false, message: '??? ???????' });
      }
      
      // ??? ??? (??? ?????? ?????? ????? ???? ?????? ? catch ??????)
      coinService.deductCoins(socket.userId, bet);
      const roomId = roomService.createRoom(socket.userId, bet);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      callback({ success: true, roomId });
      io.emit('lobby:rooms', roomService.getOpenRooms());

      const timeoutId = setTimeout(() => {
        if (roomService.isRoomWaiting(roomId)) {
          joinBotToRoom(io, roomId);
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
      
      coinService.deductCoins(socket.userId, room.bet);
      roomService.joinRoom(roomId, socket.userId);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      roomService.clearBotTimeout(roomId); 
      callback({ success: true });
      io.emit('lobby:rooms', roomService.getOpenRooms());
      
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
    io.to(roomId).emit('chat:message', { userId: socket.userId, username: socket.username, message, timestamp: Date.now() });
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

  // ========== ????? ???? ==========
  socket.on('invite:send', ({ targetUserId, bet }, callback) => {
    if (!targetUserId || !bet) {
      if (callback) callback({ success: false, message: 'Invalid data' });
      return;
    }
    const validBets = [10, 25, 50, 100, 250, 500];
    if (!validBets.includes(bet) && (bet < 10 || bet > 1000)) {
      if (callback) callback({ success: false, message: '??? ???????' });
      return;
    }

    const inviterId = socket.userId;
    try {
      coinService.deductCoins(inviterId, bet); // ??? ??? ???????
      
      const roomId = roomService.createRoom(inviterId, bet);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      
      io.to(`user_${targetUserId}`).emit('invite:received', {
        fromUserId: inviterId, fromUsername: socket.username, bet, roomId,
      });
      if (callback) callback({ success: true, roomId });
    } catch (err) {
      if (callback) callback({ success: false, message: err.message });
    }
  });

  socket.on('invite:accept', ({ inviterId, roomId }) => {
    try {
      const room = roomService.getRoom(roomId);
      if (!room) throw new Error('Room not found');

      coinService.deductCoins(socket.userId, room.bet); // ??? ??? ???????
      
      roomService.joinRoom(roomId, socket.userId);
      socket.join(roomId);
      socket.currentRoomId = roomId;
      
      io.to(`user_${inviterId}`).emit('invite:accepted', { roomId });
      
      const updatedRoom = roomService.getRoom(roomId);
      if (updatedRoom && updatedRoom.status === 'playing') {
        startTurn(io, roomId, updatedRoom.players[0]);
      }
    } catch (err) {
      socket.emit('game:error', { message: err.message });
    }
  });

  socket.on('room:leave', (roomId) => {
    const room = roomService.getRoom(roomId);
    if (!room) return;

    if (room.status === 'waiting') {
      // ??? ???? ???? ????? ??? ?????????
      coinService.refundCoins(socket.userId, room.bet);
      
      if (room.players[0] === socket.userId) {
        roomService.deleteRoom(roomId);
      } else if (typeof roomService.removePlayer === 'function') {
        roomService.removePlayer(roomId, socket.userId);
      }
    } else if (room.status === 'playing') {
      // ??? ???? ???? ???? ????? ?????? ??? (Forfeit)
      handleForfeit(io, roomId, socket.userId);
    }

    socket.leave(roomId);
    if (socket.currentRoomId === roomId) socket.currentRoomId = null;
    io.emit('lobby:rooms', roomService.getOpenRooms());
  });

  socket.on('lobby:get_rooms', () => {
    socket.emit('lobby:rooms', roomService.getOpenRooms());
  });

  socket.on('disconnect', () => {
    if (socket.currentRoomId) {
      const room = roomService.getRoom(socket.currentRoomId);
      if (room) {
        if (room.status === 'waiting') {
          if (room.players[0] === socket.userId) {
            setTimeout(() => {
              const stillRoom = roomService.getRoom(socket.currentRoomId);
              if (stillRoom && stillRoom.status === 'waiting' && stillRoom.players[0] === socket.userId) {
                coinService.refundCoins(socket.userId, room.bet);
                roomService.deleteRoom(socket.currentRoomId);
                io.emit('lobby:rooms', roomService.getOpenRooms());
              }
            }, 60000);
          } else {
            coinService.refundCoins(socket.userId, room.bet);
            if (typeof roomService.removePlayer === 'function') {
              roomService.removePlayer(socket.currentRoomId, socket.userId);
            }
          }
        } else if (room.status === 'playing') {
          handleForfeit(io, socket.currentRoomId, socket.userId);
        }
      }
    }
  });

  // ========== ????? ???? ==========

  function handleForfeit(io, roomId, userId) {
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'playing') return;

    const opponentId = room.players.find(p => p !== userId);
    if (opponentId !== undefined) {
      // ???? ????? ????? ?????? ? ??? ?? ??????
      coinService.finalizeGame(opponentId, userId, room.bet);
    }

    roomService.deleteRoom(roomId);
    io.emit('lobby:rooms', roomService.getOpenRooms());
    io.to(roomId).emit('game:forfeit', { userId, winnerId: opponentId });
  }

  function joinBotToRoom(io, roomId) {
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'waiting') return;

    coinService.deductCoins(-1, room.bet); // ???? ???? ??? ???? ???????
    room.players.push(-1);
    room.status = 'playing';
    room.isBotGame = true;
    room.currentTurn = room.players[0];
    roomService.clearBotTimeout(roomId);
    io.emit('lobby:rooms', roomService.getOpenRooms());
    io.to(roomId).emit('game:your_turn', { playerId: room.currentTurn });

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

  function startTurn(io, roomId, playerId) {
    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'playing') return;
    room.currentTurn = playerId;
    if (playerId !== -1) io.to(roomId).emit('game:your_turn', { playerId });
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