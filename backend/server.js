const db = require('./config/db');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const communityRoutes = require('./routes/communityRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const customFeedRoutes = require('./routes/customFeedRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, please try again later' },
    skip: (req) => req.method !== 'POST'
});

const { initializeSocket } = require('./config/socket');
const server = initializeSocket(app, process.env.FRONTEND_URL);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/custom-feeds', customFeedRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
//Server Health Check 
app.use('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({
            status: 'UP',
            database: 'Connected',
            serverTime: result.rows[0].now
        });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({
            status: 'DOWN',
            database: 'Disconnected',
            error: 'Service unavailable'
        });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
