const db = require('../config/db');

function logTransaction(userId, amount, type, ref = null) {
  db.run(
    'INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [userId, amount, type, ref]
  );
}

function getTransactionsByUser(userId, limit = 20) {
  return db.query(
    'SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
    [userId, limit]
  );
}

module.exports = { logTransaction, getTransactionsByUser };