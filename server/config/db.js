const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let db = null;
let transactionDepth = 0;

async function initDb() {
  const SQL = await initSqlJs();
  let shouldSave = false;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    shouldSave = true;
  }

  // ????? ????
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, phone TEXT, lastName TEXT, email TEXT, coins INTEGER NOT NULL DEFAULT 0, locked INTEGER NOT NULL DEFAULT 0, referralCode TEXT UNIQUE, referredBy INTEGER, dailyRewardClaimedAt TEXT, role TEXT DEFAULT 'user', wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, lastLoginIp TEXT, lastLoginDevice TEXT, lastLoginAt TEXT, failed_attempts INTEGER DEFAULT 0, locked_until TEXT, is_banned INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, amount INTEGER NOT NULL, type TEXT NOT NULL, ref TEXT, createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS game_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, roomId TEXT NOT NULL, player1Id INTEGER NOT NULL, player2Id INTEGER NOT NULL, bet INTEGER NOT NULL, dice1 TEXT NOT NULL, dice2 TEXT NOT NULL, winnerId INTEGER, rake INTEGER NOT NULL DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, roomId TEXT NOT NULL, userId INTEGER NOT NULL, username TEXT NOT NULL, message TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, friendId INTEGER NOT NULL, status TEXT DEFAULT 'pending', createdAt TEXT DEFAULT (datetime('now')), UNIQUE(userId, friendId))`);
  db.run(`CREATE TABLE IF NOT EXISTS support_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, username TEXT NOT NULL, phone TEXT, message TEXT NOT NULL, isFromAdmin INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS global_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, username TEXT NOT NULL, message TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);

  // ???????? ????
  try { db.run(`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`); } catch(e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`); } catch(e) {}
  try { db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS friend_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, fromUserId INTEGER NOT NULL, toUserId INTEGER NOT NULL, status TEXT DEFAULT 'pending', createdAt TEXT DEFAULT (datetime('now')), UNIQUE(fromUserId, toUserId))`);
  db.run(`CREATE TABLE IF NOT EXISTS tournaments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, entryFee INTEGER NOT NULL, prizePool INTEGER NOT NULL, maxPlayers INTEGER NOT NULL, currentPlayers INTEGER DEFAULT 1, status TEXT DEFAULT 'waiting', createdAt TEXT DEFAULT (datetime('now')), startedAt TEXT, completedAt TEXT, winnerId INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS tournament_participants (id INTEGER PRIMARY KEY AUTOINCREMENT, tournamentId INTEGER NOT NULL, userId INTEGER NOT NULL, isWinner BOOLEAN DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), UNIQUE(tournamentId, userId))`);
  db.run(`CREATE TABLE IF NOT EXISTS tournament_matches (id INTEGER PRIMARY KEY AUTOINCREMENT, tournamentId INTEGER NOT NULL, round INTEGER NOT NULL, player1Id INTEGER, player2Id INTEGER, winnerId INTEGER, status TEXT DEFAULT 'pending', createdAt TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS match_history (id INTEGER PRIMARY KEY AUTOINCREMENT, player1Id INTEGER NOT NULL, player2Id INTEGER NOT NULL, winnerId INTEGER, bet INTEGER NOT NULL, dice1 TEXT NOT NULL, dice2 TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')))`);

  // ???? private_messages
  let needRecreatePrivate = false;
  try {
    const columns = db.exec("PRAGMA table_info(private_messages)");
    if (columns.length > 0 && columns[0].values.length > 0) {
      const columnNames = columns[0].values.map(row => row[1]);
      if (!columnNames.includes('status') || !columnNames.includes('isRead')) {
        needRecreatePrivate = true;
      }
    }
  } catch (e) { needRecreatePrivate = false; }

  if (needRecreatePrivate) {
    console.log('?? Recreating private_messages table');
    db.run("DROP TABLE IF EXISTS private_messages");
    shouldSave = true;
  }

  db.run(`CREATE TABLE IF NOT EXISTS private_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, fromUserId INTEGER NOT NULL, toUserId INTEGER NOT NULL, message TEXT NOT NULL, isRead INTEGER DEFAULT 0, status TEXT DEFAULT 'sent', createdAt TEXT DEFAULT (datetime('now')))`);

  // ???? house
  const house = db.exec("SELECT id FROM users WHERE id = 0");
  if (house.length === 0 || house[0].values.length === 0) {
    db.run("INSERT INTO users (id, username, passwordHash, coins, role) VALUES (0, 'house', 'not_a_hash', 0, 'system')");
    shouldSave = true;
  }

  // ????
  const bot = db.exec("SELECT id FROM users WHERE id = -1");
  if (bot.length === 0 || bot[0].values.length === 0) {
    db.run("INSERT INTO users (id, username, passwordHash, coins, role) VALUES (-1, '?? Bot', 'bot_hash', 1000000, 'bot')");
    shouldSave = true;
  }

  // ????? ???
  const testUser = db.exec("SELECT id FROM users WHERE username = 'test'");
  if (testUser.length === 0 || testUser[0].values.length === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.run("INSERT INTO users (username, passwordHash, coins, phone, lastName) VALUES ('test', ?, 500, '09120000000', 'Test')", [hash]);
    shouldSave = true;
  } else {
    db.run("UPDATE users SET coins = 500 WHERE username = 'test'");
    shouldSave = true;
  }

  if (shouldSave) saveDb();
  console.log('? DB initialized');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function serializeParams(params) {
  return params.map(p => p === undefined ? null : p);
}

function run(sql, params = []) {
  if (!db) throw new Error('DB not ready');
  db.run(sql, serializeParams(params));
  const modified = db.getRowsModified();
  if (transactionDepth === 0) saveDb();
  return modified;
}

// ????? ?????: ????? last_insert_rowid ??? ?? saveDb
function runAndGetId(sql, params = []) {
  if (!db) throw new Error('DB not ready');
  db.run(sql, serializeParams(params));
  const res = db.exec('SELECT last_insert_rowid()');
  const id = res[0].values[0][0];
  if (transactionDepth === 0) saveDb();
  return id;
}

function getRowsModified() {
  if (!db) throw new Error('DB not ready');
  return db.getRowsModified();
}

function query(sql, params = []) {
  if (!db) throw new Error('DB not ready');
  const stmt = db.prepare(sql);
  stmt.bind(serializeParams(params));
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function transaction(fn) {
  if (!db) throw new Error('DB not ready');
  const isTopLevel = transactionDepth === 0;
  if (isTopLevel) {
    db.run('BEGIN');
    transactionDepth++;
  }
  try {
    fn();
    if (isTopLevel) {
      db.run('COMMIT');
      transactionDepth--;
      saveDb();
    }
  } catch (err) {
    if (isTopLevel) {
      db.run('ROLLBACK');
      transactionDepth--;
      saveDb();
    }
    throw err;
  }
}

module.exports = { initDb, run, runAndGetId, query, transaction, getRowsModified };