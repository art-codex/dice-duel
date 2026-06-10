const db = require('../config/db');
const userModel = require('../models/user.model');

// قفل کردن سکه (فقط locked را زیاد می‌کند)
function lockCoins(userId, amount) {
  amount = Number(amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
  const user = userModel.findUserById(userId);
  if (!user) throw new Error('User not found');
  const available = user.coins - user.locked;
  if (available < amount) throw new Error(`Insufficient balance: ${available} < ${amount}`);
  db.run('UPDATE users SET locked = locked + ? WHERE id = ?', [amount, userId]);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [userId, 0, 'LOCK', `lock_${Date.now()}`]);
  const updated = userModel.findUserById(userId);
  console.log(`🔒 lockCoins: user ${userId} locked +${amount} → coins=${updated.coins}, locked=${updated.locked}, avail=${updated.coins - updated.locked}`);
}

// آزاد کردن قفل سکه (جلوگیری از منفی شدن locked)
function unlockCoins(userId, amount) {
  amount = Number(amount);
  const before = userModel.findUserById(userId);
  if (!before) return;
  let newLocked = before.locked - amount;
  if (newLocked < 0) {
    console.error(`❌ unlockCoins: user ${userId} locked would be negative (${before.locked} - ${amount}). Setting to 0.`);
    newLocked = 0;
  }
  db.run('UPDATE users SET locked = ? WHERE id = ?', [newLocked, userId]);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [userId, 0, 'UNLOCK', `unlock_${Date.now()}`]);
  const after = userModel.findUserById(userId);
  console.log(`🔓 unlockCoins: user ${userId} locked ${before.locked} → ${after.locked} (attempted -${amount})`);
}

// پایان بازی (محاسبه صحیح با bet واقعی)
function finalizeGame(winnerId, loserId, bet) {
  console.log(`🎲 finalizeGame START: winner=${winnerId}, loser=${loserId}, bet=${bet}`);
  const winnerBefore = userModel.findUserById(winnerId);
  const loserBefore = userModel.findUserById(loserId);
  console.log(`💰 Before: winner ${winnerId} coins=${winnerBefore.coins}, locked=${winnerBefore.locked}, wins=${winnerBefore.wins}`);
  console.log(`💰 Before: loser ${loserId} coins=${loserBefore.coins}, locked=${loserBefore.locked}, losses=${loserBefore.losses}`);

  // 1. آزادسازی قفل شرط از هر دو
  unlockCoins(winnerId, bet);
  unlockCoins(loserId, bet);

  // 2. کسر شرط از بازنده
  userModel.updateBalance(loserId, -bet);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [loserId, -bet, 'LOSS', `game_${Date.now()}`]);

  // 3. محاسبه جایزه و کارمزد (۱۰٪ کمیسیون)
  const total = bet * 2;
  const rake = Math.floor(total * 0.10);
  const prize = total - rake;
  console.log(`🧮 total=${total}, rake=${rake}, prize=${prize}`);

  // 4. افزودن جایزه به برنده
  userModel.updateBalance(winnerId, prize);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [winnerId, prize, 'WIN', `game_${Date.now()}`]);

  // 5. کارمزد به هاوس
  userModel.updateBalance(0, rake);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)',
    [0, rake, 'HOUSE_RAKE', `game_${Date.now()}`]);

  // 6. به‌روزرسانی آمار برد/باخت
  userModel.updateWins(winnerId);
  userModel.updateLosses(loserId);
  console.log(`🏆 Winner ${winnerId} wins increased, Loser ${loserId} losses increased`);

  const winnerAfter = userModel.findUserById(winnerId);
  const loserAfter = userModel.findUserById(loserId);
  console.log(`🎉 After: winner ${winnerId} coins=${winnerAfter.coins} (change: +${prize}), wins=${winnerAfter.wins}`);
  console.log(`💀 After: loser ${loserId} coins=${loserAfter.coins} (change: -${bet}), losses=${loserAfter.losses}`);
  console.log(`✅ finalizeGame END`);
}

function handleTie(user1Id, user2Id, bet) {
  console.log(`🤝 handleTie: users ${user1Id}, ${user2Id}, bet=${bet}`);
  unlockCoins(user1Id, bet);
  unlockCoins(user2Id, bet);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)', [user1Id, 0, 'TIE', `tie_${Date.now()}`]);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)', [user2Id, 0, 'TIE', `tie_${Date.now()}`]);
}

function addCoins(userId, amount, type) {
  const before = userModel.findUserById(userId);
  db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [amount, userId]);
  db.run('INSERT INTO transactions (userId, amount, type, ref) VALUES (?, ?, ?, ?)', [userId, amount, type, `reward_${Date.now()}`]);
  const after = userModel.findUserById(userId);
  console.log(`💰 addCoins: user ${userId} +${amount} (${type}) → ${before.coins} → ${after.coins}`);
}

module.exports = {
  lockCoins,
  unlockCoins,
  finalizeGame,
  handleTie,
  addCoins,
  addRewardCoins: addCoins,
  addPurchaseCoins: (userId, amount) => addCoins(userId, amount, 'PURCHASE'),
};