const db = require('../config/db');

function createUser(username, passwordHash, phone, lastName, email = null) {
  return db.runAndGetId(
    `INSERT INTO users (username, passwordHash, phone, lastName, email) 
     VALUES (?, ?, ?, ?, ?)`,
    [username, passwordHash, phone, lastName, email]
  );
}

function findUserById(id) {
  const rows = db.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

function findUserByUsername(username) {
  const rows = db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] || null;
}

function updateBalance(userId, amount) {
  db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [amount, userId]);
}

function updateLocked(userId, amount) {
  db.run('UPDATE users SET locked = locked + ? WHERE id = ?', [amount, userId]);
}

function getUserBalance(userId) {
  const user = findUserById(userId);
  if (!user) return null;
  return {
    coins: user.coins,
    available: user.coins,
  };
}

function generateReferralCode(userId) {
  const code = userId.toString(36).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();
  db.run('UPDATE users SET referralCode = ? WHERE id = ?', [code, userId]);
  return code;
}

function findByReferralCode(code) {
  const rows = db.query('SELECT * FROM users WHERE referralCode = ?', [code]);
  return rows[0] || null;
}

function setDailyRewardClaimed(userId, isoDate) {
  db.run('UPDATE users SET dailyRewardClaimedAt = ? WHERE id = ?', [isoDate, userId]);
}

function isAdmin(userId) {
  const user = findUserById(userId);
  return user && user.role === 'admin';
}

module.exports = {
  createUser,
  findUserById,
  findUserByUsername,
  updateBalance,
  updateLocked,
  getUserBalance,
  generateReferralCode,
  findByReferralCode,
  setDailyRewardClaimed,
  isAdmin,
};