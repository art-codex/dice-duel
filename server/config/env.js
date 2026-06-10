const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/database.sqlite',
};