const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/user.model');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[0-9]{11}$/).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().optional(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, password, phone, lastName, email } = req.body;
  const existing = userModel.findUserByUsername(username);
  if (existing) return res.status(400).json({ message: 'Username already exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = userModel.createUser(username, hashedPassword, phone, lastName, email);
  userModel.generateReferralCode(userId);
  const token = signToken(userId);
  res.status(201).json({ token, userId, username, role: 'user' });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  const user = userModel.findUserByUsername(username);
  if (!user) return res.status(400).json({ message: 'Invalid username or password' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid username or password' });
  const token = signToken(user.id);
  res.json({ token, userId: user.id, username: user.username, role: user.role });
});

// ========== NEW ENDPOINT ==========
router.get('/referral-code', auth, (req, res) => {
  const user = userModel.findUserById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const code = user.referralCode || userModel.generateReferralCode(req.userId);
  res.json({ code });
});

module.exports = router;