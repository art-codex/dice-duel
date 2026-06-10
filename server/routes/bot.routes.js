const express = require('express');
const auth = require('../middleware/auth');
const roomService = require('../services/roomService');
const coinService = require('../services/coinService');
const gameService = require('../services/gameService');

const router = express.Router();

// تابع کمکی برای پیشبرد بازی (نوبت بعدی، تاس خودکار)
function advanceGame(io, roomId) {
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
  if (room.rollTimer) clearTimeout(room.rollTimer);
  room.rollTimer = setTimeout(() => {
    const currentRoom = roomService.getRoom(roomId);
    if (currentRoom && currentRoom.currentTurn === nextPlayer && !currentRoom.diceResults[nextPlayer]) {
      const dice = gameService.rollForPlayer(nextPlayer, currentRoom);
      io.to(roomId).emit('game:roll_result', { playerId: nextPlayer, dice });
      advanceGame(io, roomId);
    }
  }, delay);
}

router.post('/play', auth, (req, res) => {
  console.log('🤖 Bot play request received');
  const { bet } = req.body;
  if (!bet || bet < 10 || bet > 1000) {
    return res.status(400).json({ message: 'شرط باید بین ۱۰ تا ۱۰۰۰ سکه باشد' });
  }
  const betNum = Number(bet);
  try {
    coinService.lockCoins(req.userId, betNum);
    coinService.lockCoins(-1, betNum);
    const roomId = roomService.createRoom(req.userId, betNum, true);
    console.log(`✅ Bot room created: ${roomId}`);

    const io = req.app.get('io');
    if (!io) {
      console.error('❌ io not found in app');
      return res.status(500).json({ message: 'Internal server error' });
    }

    const room = roomService.getRoom(roomId);
    if (!room || room.status !== 'playing') {
      console.error('❌ Room not in playing status', room);
      return res.status(500).json({ message: 'Room creation failed' });
    }

    // نوبت اول با انسان
    room.currentTurn = req.userId;
    console.log(`🎲 Emitting game:your_turn to room ${roomId} for player ${req.userId}`);
    io.to(roomId).emit('game:your_turn', { playerId: req.userId });

    // تایمر 20 ثانیه برای انسان
    if (room.rollTimer) clearTimeout(room.rollTimer);
    room.rollTimer = setTimeout(() => {
      const currentRoom = roomService.getRoom(roomId);
      if (currentRoom && currentRoom.currentTurn === req.userId && !currentRoom.diceResults[req.userId]) {
        console.log(`⏰ Human timeout, auto rolling for ${req.userId}`);
        const dice = gameService.rollForPlayer(req.userId, currentRoom);
        io.to(roomId).emit('game:roll_result', { playerId: req.userId, dice });
        advanceGame(io, roomId);
      }
    }, 20000);

    res.json({ roomId });
  } catch (err) {
    console.error('❌ Bot play error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;