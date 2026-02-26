const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;
let userSockets = new Map();

const initializeSocket = (app, frontendUrl) => {
    const server = http.createServer(app);
    io = new Server(server, {
        cors: { origin: frontendUrl }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = String(decoded.id);
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        if (userId) {
            userSockets.set(userId, socket.id);
        }
        socket.on('disconnect', () => {
            if (userId) {
                userSockets.delete(userId);
            }
        });
    });

    return server;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket first.');
    }
    return io;
};

const getUserSockets = () => {
    return userSockets;
};

module.exports = {
    initializeSocket,
    getIO,
    getUserSockets
};
