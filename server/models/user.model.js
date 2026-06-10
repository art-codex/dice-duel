const db = require('../config/db');

function createUser(username, passwordHash, phone, lastName, email = null) {
  db.run(
    `INSERT INTO users (username, passwordHash, phone, lastName, email) 
     VALUES (?, ?, ?, ?, ?)`,
    [username, passwordHash, phone, lastName, email]
  );
  return db.getLastInsertId();
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
  if (userId === 0) return { coins: 0, locked: 0, available: 0 }; // house نباید به عنوان کاربر عادی دیده شود
  const user = findUserById(userId);
  if (!user) return null;
  return {
    coins: user.coins,
    locked: user.locked,
    available: user.coins - user.locked,
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


function setInstagramVerified(userId, value = 1) {
  db.run('UPDATE users SET instagramVerified = ? WHERE id = ?', [value, userId]);
}

function getInstagramVerified(userId) {
  const user = findUserById(userId);
  return user ? user.instagramVerified : 0;
}

function setRobikaVerified(userId, value = 1) {
  db.run('UPDATE users SET robikaVerified = ? WHERE id = ?', [value, userId]);
}

function getRobikaVerified(userId) {
  const user = findUserById(userId);
  return user ? user.robikaVerified : 0;
}


function updateWins(userId) {
  db.run('UPDATE users SET wins = wins + 1 WHERE id = ?', [userId]);
}

function updateLosses(userId) {
  db.run('UPDATE users SET losses = losses + 1 WHERE id = ?', [userId]);
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
  updateWins,
  updateLosses,
};