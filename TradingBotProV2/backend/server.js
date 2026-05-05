const express  = require('express');
const cors     = require('cors');
const dotenv   = require('dotenv');
const http     = require('http');
const { Server } = require('socket.io');
const connectDB= require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:3000'], methods: ['GET','POST'] }
});
app.set('io', io);

io.on('connection', socket => {
  console.log('Frontend connected:', socket.id);
  socket.on('disconnect', () => console.log('Frontend disconnected:', socket.id));
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/trades',  require('./routes/trades'));
app.use('/api/zones',   require('./routes/zones'));
app.use('/api/bot',     require('./routes/bot'));
app.use('/api/alerts',  require('./routes/alerts'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/stats',   require('./routes/stats'));
app.use('/api/prices',  require('./routes/prices'));   // live price feed

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
