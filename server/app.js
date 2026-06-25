const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const serveStatic = require('serve-static');
const authRoutes = require('./routes/auth.routes');
const coinRoutes = require('./routes/coin.routes');
const taskRoutes = require('./routes/task.routes');
const adminRoutes = require('./routes/admin.routes');
const rankingsRoutes = require('./routes/rankings');
const friendsRoutes = require('./routes/friends.routes');
const botRoutes = require('./routes/bot.routes');
const userRoutes = require('./routes/user.routes');
const tournamentRoutes = require('./routes/tournament.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ??? ???? ???????? ????? ??? ?? ???????? ?? .jfif
app.use('/uploads', serveStatic(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.jfif')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tournament', tournamentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;