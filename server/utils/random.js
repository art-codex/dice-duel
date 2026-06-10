const crypto = require('crypto');

function rollDice() {
  return crypto.randomInt(1, 7); // 1..6
}

module.exports = { rollDice };