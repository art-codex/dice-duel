const express = require('express');
const auth = require('../middleware/auth');
const userModel = require('../models/user.model');
const transactionModel = require('../models/transaction.model');
const db = require('../config/db');

const router = express.Router();

router.get('/balance', auth, (req, res) => {
  const balance = userModel.getUserBalance(req.userId);
  res.json(balance);
});

router.get('/transactions', auth, (req, res) => {
  const txns = transactionModel.getTransactionsByUser(req.userId);
  res.json(txns);
});

// ========== NEW ENDPOINT ==========
router.get('/match-history', auth, (req, res) => {
  try {
    const history = db.query(`
      SELECT gl.*, 
             u1.username as player1Name, 
             u2.username as player2Name 
      FROM game_logs gl
      LEFT JOIN users u1 ON gl.player1Id = u1.id
      LEFT JOIN users u2 ON gl.player2Id = u2.id
      WHERE gl.player1Id = ? OR gl.player2Id = ? 
      ORDER BY gl.createdAt DESC LIMIT 50
    `, [req.userId, req.userId]);
    res.json(history);
  } catch (err) {
    console.error('Match history error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;