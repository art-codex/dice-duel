const crypto = require('crypto');
const coinService = require('./coinService');
const gameLogModel = require('../models/gameLog.model');
const db = require('../config/db');

function rollDice() {
  return crypto.randomInt(1, 7);
}

function rollForPlayer(userId, room) {
  const dice = [rollDice(), rollDice()];
  room.diceResults[userId] = dice;
  return dice;
}

function determineWinner(room) {
  const [p1, p2] = room.players;
  const d1 = room.diceResults[p1];
  const d2 = room.diceResults[p2];
  const sum1 = d1[0] + d1[1];
  const sum2 = d2[0] + d2[1];
  const bet = room.bet;

  let winnerId = null, loserId = null, tie = false;

  if (sum1 > sum2) { winnerId = p1; loserId = p2; }
  else if (sum2 > sum1) { winnerId = p2; loserId = p1; }
  else tie = true;

  let result = { player1: p1, player2: p2, dice1: d1, dice2: d2, sum1, sum2, tie };

  if (!tie) {
    coinService.finalizeGame(winnerId, loserId, bet);
    updateUserXP(winnerId, 50);
    updateUserXP(loserId, 10);
    const rake = Math.floor(bet * 2 * 0.05);
    gameLogModel.logGame(room.id, p1, p2, bet, d1, d2, winnerId, rake);
    result.winnerId = winnerId;
  } else {
    coinService.handleTie(p1, p2, bet);
    updateUserXP(p1, 15);
    updateUserXP(p2, 15);
    gameLogModel.logGame(room.id, p1, p2, bet, d1, d2, null, 0);
    result.winnerId = null;
  }

  return result;
}

// تابع به‌روزرسانی XP و سطح کاربر
function updateUserXP(userId, xpGain) {
  // دریافت اطلاعات فعلی کاربر
  const user = db.query('SELECT xp, level FROM users WHERE id = ?', [userId])[0];
  if (!user) return;

  const newXP = (user.xp || 0) + xpGain;
  // فرمول سطح: هر ۱۰۰ XP یک سطح (سطح ۱ از ۰ شروع می‌شود)
  const newLevel = Math.floor(newXP / 100) + 1;

  // ذخیره در دیتابیس
  db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXP, newLevel, userId]);

  // لاگ در کنسول (اختیاری)
  console.log(`🎖️ User ${userId} gained ${xpGain} XP → total ${newXP} XP (Level ${newLevel})`);
}

module.exports = { rollForPlayer, determineWinner, updateUserXP };