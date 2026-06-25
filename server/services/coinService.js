const db = require('../config/db');
const userModel = require('../models/user.model');
const transactionModel = require('../models/transaction.model');

function deductCoins(userId, amount) {
  amount = Number(amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
  if (userId === -1) return;

  const user = userModel.findUserById(userId);
  console.log(`?? [DEBUG] userId: ${userId}, bet: ${amount}, DB coins: ${user ? user.coins : 'NOT FOUND'}`);

  const modified = db.run(`UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?`, [amount, userId, amount]);
  
  if (modified === 0) {
    console.log(`? [DEBUG] FAILED! DB coins (${user?.coins}) < bet (${amount})`);
    throw new Error('?????? ??????');
  }
  
  transactionModel.logTransaction(userId, -amount, 'DEDUCT', `deduct_${Date.now()}`);
  console.log(`? [DEBUG] SUCCESS! User ${userId} deducted ${amount}`);
}

function refundCoins(userId, amount) {
  amount = Number(amount);
  if (isNaN(amount) || amount <= 0) return;
  if (userId === -1) return;

  db.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [amount, userId]);
  transactionModel.logTransaction(userId, amount, 'REFUND', `refund_${Date.now()}`);
  console.log(`?? refundCoins: user ${userId} refunded +${amount}`);
}

function finalizeGame(winnerId, loserId, bet) {
  const total = bet * 2;
  const rake = Math.floor(total * 0.05);
  const prize = total - rake;

  db.transaction(() => {
    userModel.updateBalance(winnerId, prize);
    transactionModel.logTransaction(winnerId, prize, 'WIN', `game_${Date.now()}`);
    transactionModel.logTransaction(loserId, -bet, 'LOSS', `game_${Date.now()}`);
    userModel.updateBalance(0, rake);
    transactionModel.logTransaction(0, rake, 'HOUSE_RAKE', `game_${Date.now()}`);
  });
}

function handleTie(user1Id, user2Id, bet) {
  db.transaction(() => {
    userModel.updateBalance(user1Id, bet);
    userModel.updateBalance(user2Id, bet);
    transactionModel.logTransaction(user1Id, bet, 'TIE_REFUND', `tie_${Date.now()}`);
    transactionModel.logTransaction(user2Id, bet, 'TIE_REFUND', `tie_${Date.now()}`);
  });
}

function addCoins(userId, amount, type) {
  db.transaction(() => {
    userModel.updateBalance(userId, amount);
    transactionModel.logTransaction(userId, amount, type, `reward_${Date.now()}`);
  });
}

module.exports = {
  deductCoins,
  refundCoins,
  finalizeGame,
  handleTie,
  addCoins,
};