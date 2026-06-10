const { initDb, run } = require('./config/db');
const bcrypt = require('bcryptjs');

(async () => {
  await initDb();
  const username = process.argv[2];
  const newPassword = process.argv[3];
  if (!username || !newPassword) {
    console.error('Usage: node change-password.js <username> <newPassword>');
    process.exit(1);
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  run("UPDATE users SET passwordHash = ? WHERE username = ?", [hashed, username]);
  console.log(`✅ رمز عبور کاربر ${username} با موفقیت تغییر کرد. رمز جدید: ${newPassword}`);
  process.exit(0);
})();