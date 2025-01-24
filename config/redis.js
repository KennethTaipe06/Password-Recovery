const redis = require('redis');

const connectRedis = () => {
    const redisClient = redis.createClient({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
    redisClient.on('error', (err) => {
        console.log('Redis error: ', err);
    });
    return redisClient;
};

module.exports = connectRedis;
