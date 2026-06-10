const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

// دریافت رنکینگ برترین بازیکنان (بر اساس تعداد برد)
router.get('/', auth, (req, res) => {
  try {
    const rankings = db.query(`
      SELECT id, username, wins, losses, (wins + losses) as totalGames,
             ROUND(CAST(wins AS FLOAT) / NULLIF(wins + losses, 0) * 100, 1) as winRate
      FROM users
      WHERE id > 0 AND (wins + losses) > 0
      ORDER BY wins DESC, winRate DESC
      LIMIT 50
    `);
    res.json(rankings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;