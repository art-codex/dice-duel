const { run } = require('../config/db');

function logGame(roomId, player1Id, player2Id, bet, dice1, dice2, winnerId, rake) {
  run('INSERT INTO game_logs (roomId, player1Id, player2Id, bet, dice1, dice2, winnerId, rake) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [roomId, player1Id, player2Id, bet, JSON.stringify(dice1), JSON.stringify(dice2), winnerId, rake]
  );
}

module.exports = { logGame };