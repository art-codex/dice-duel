const express = require('express');
const auth = require('../middleware/auth');
const userModel = require('../models/user.model');
const { addCoins } = require('../services/coinService');
const db = require('../config/db'); // اضافه شد

const router = express.Router();

router.post('/daily-reward', auth, (req, res) => {
  try {
    const user = userModel.findUserById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const today = new Date().toISOString().split('T')[0];
    if (user.dailyRewardClaimedAt === today) {
      return res.status(400).json({ message: 'امروز قبلاً دریافت کرده‌اید' });
    }
    addCoins(req.userId, 10, 'DAILY_REWARD');
    db.run('UPDATE users SET dailyRewardClaimedAt = ? WHERE id = ?', [today, req.userId]);
    res.json({ message: '۱۰ سکه به موجودی شما اضافه شد' });
  } catch (err) {
    console.error('daily-reward error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/referral', auth, (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'کد معرف الزامی است' });
    const referredUser = userModel.findByReferralCode(code);
    if (!referredUser || referredUser.id === req.userId) {
      return res.status(400).json({ message: 'کد معرف نامعتبر است' });
    }
    const currentUser = userModel.findUserById(req.userId);
    if (currentUser.referredBy) {
      return res.status(400).json({ message: 'شما قبلاً از کد معرف استفاده کرده‌اید' });
    }
    db.run('UPDATE users SET referredBy = ? WHERE id = ?', [referredUser.id, req.userId]);
    addCoins(req.userId, 20, 'REFERRAL');
    addCoins(referredUser.id, 20, 'REFERRAL');
    res.json({ message: 'کد معرف اعمال شد، ۲۰ سکه به شما و دوستتان تعلق گرفت!' });
  } catch (err) {
    console.error('referral error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-telegram', auth, (req, res) => {
  try {
    addCoins(req.userId, 5, 'TASK_TELEGRAM');
    res.json({ message: '۵ سکه برای عضویت در تلگرام اضافه شد' });
  } catch (err) {
    console.error('telegram error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;