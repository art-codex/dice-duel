require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION!', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION!', reason);
});

const http = require('http');
const { initDb } = require('./config/db');

async function start() {
  try {
    await initDb();
    console.log('Database initialized');
    const app = require('./app');
    const setupSocket = require('./socket');
    
    const server = http.createServer(app);
    const io = setupSocket(server);
    const supportIo = io.of('/support');
    supportIo.on('connection', (socket) => {
      console.log('Support socket connected');
    });
    // ذخیره io در app برای استفاده در روت‌ها
    app.set('io', io);
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => console.log(`Server on ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();