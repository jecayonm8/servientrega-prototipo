const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  }
});

client.on('error', (err) => console.error('❌ Redis error:', err.message));
client.on('connect', () => console.log('✅ Redis conectado'));

client.connect();

module.exports = client;
