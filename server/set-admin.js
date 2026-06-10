const { initDb, run } = require('./config/db');

(async () => {
  await initDb();
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: node set-admin.js <username>');
    process.exit(1);
  }
  run("UPDATE users SET role = 'admin' WHERE username = ?", [username]);
  console.log(`✅ کاربر ${username} اکنون ادمین است.`);
  process.exit(0);
})();