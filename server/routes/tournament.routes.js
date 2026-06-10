const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const router = express.Router();

router.get('/', auth, (req, res) => {
  try {
    const tournaments = db.query(`
      SELECT * FROM tournaments 
      WHERE status = 'waiting' OR status = 'active'
      ORDER BY createdAt DESC
    `);
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;