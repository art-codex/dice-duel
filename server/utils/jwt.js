const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_SECRET = env.JWT_SECRET;
const EXPIRES_IN = '7d';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };