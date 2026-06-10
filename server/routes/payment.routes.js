const express = require('express');
const auth = require('../middleware/auth');
const coinService = require('../services/coinService');

const router = express.Router();

router.post('/create', auth, (req, res) => {
  const { amount } = req.body; // amount in Tomans
  const authority = 'fake_' + Date.now();
  const paymentUrl = `http://localhost:3001/api/payment/verify?authority=${authority}&amount=${amount}&userId=${req.userId}`;
  res.json({ paymentUrl, authority });
});

router.get('/verify', (req, res) => {
  const { authority, amount, userId } = req.query;
  const coinsToAdd = Math.floor(Number(amount) / 100); // 100 Toman per coin
  coinService.addPurchaseCoins(Number(userId), coinsToAdd);
  res.redirect(`http://localhost:5173/wallet?payment=success&coins=${coinsToAdd}`);
});

module.exports = router;