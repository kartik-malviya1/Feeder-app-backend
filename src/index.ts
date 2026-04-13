import 'dotenv/config';
import { buildApp } from './app.js';

const start = async () => {
  try {
    const app = await buildApp();
    const port = parseInt(process.env.PORT || '3000');
    
    await app.listen({ port, host: '0.0.0.0' });
    
    console.log(`
🚀 Ride-Sharing Backend is running!
📡 Server: http://localhost:${port}
🔌 WebSocket: ws://localhost:${port}/ws
    `);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
