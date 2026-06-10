const rooms = new Map();

function createRoom(userId, bet, isBot = false) {
  const roomId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  const room = {
    id: roomId,
    players: [userId],
    bet,
    status: 'waiting',
    diceResults: {},
    currentTurn: null,
    rollTimer: null,
    createdAt: Date.now(),
    botTimeout: null,
  };
  rooms.set(roomId, room);
  return roomId;
}

function joinRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'waiting') throw new Error('Room already started');
  if (room.players.length >= 2) throw new Error('Room full');
  room.players.push(userId);
  room.status = 'playing';
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    if (room.rollTimer) clearTimeout(room.rollTimer);
    if (room.botTimeout) clearTimeout(room.botTimeout);
  }
  rooms.delete(roomId);
}

function getOpenRooms() {
  const open = [];
  for (const [id, room] of rooms) {
    if (room.status === 'waiting') {
      open.push({ id, bet: room.bet, playersCount: room.players.length });
    }
  }
  return open;
}

function isRoomWaiting(roomId) {
  const room = rooms.get(roomId);
  return room && room.status === 'waiting';
}

function setBotTimeout(roomId, timeoutId) {
  const room = rooms.get(roomId);
  if (room) room.botTimeout = timeoutId;
}

function clearBotTimeout(roomId) {
  const room = rooms.get(roomId);
  if (room && room.botTimeout) {
    clearTimeout(room.botTimeout);
    room.botTimeout = null;
  }
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  deleteRoom,
  getOpenRooms,
  isRoomWaiting,
  setBotTimeout,
  clearBotTimeout,
};