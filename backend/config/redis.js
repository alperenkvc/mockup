const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                return new Error('Redis connection retries exhausted');
            }
            return Math.min(retries * 50, 1000);
        }
    }
});

redisClient.on('error', (err) => console.error('Redis client error:', err));
redisClient.on('connect', () => console.log('Redis client connected'));

let isConnected = false;
const connectRedis = async () => {
    if(!isConnected) {
        try{
            await redisClient.connect();
            isConnected = true;
            console.log('Redis client connected');
        }catch (error) {
            console.error('Redis client connection error:', error);
            setTimeout(connectRedis, 5000);
        }
    }
    return redisClient;
}

module.exports = { connectRedis, redisClient };