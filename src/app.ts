import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import { sql } from 'drizzle-orm';

// Plugins
import drizzlePlugin from './plugins/drizzle.js';
import jwtPlugin from './plugins/jwt.js';
import websocketPlugin from './plugins/websocket.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import rideRoutes from './routes/ride.routes.js';
import locationRoutes from './routes/location.routes.js';
import wsRoutes from './routes/ws.routes.js';

export const buildApp = async () => {
  const fastify = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Add Zod Compiler
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register Plugins
  await fastify.register(cors, { origin: true }); // allow all origins (Expo needs this)
  await fastify.register(drizzlePlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(websocketPlugin);

  // ─── Health Check / DB Test Route ───
  fastify.get('/test', async (request, reply) => {
    try {
      await fastify.db.execute(sql`SELECT 1`);
      return reply.send({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (error: any) {
      return reply.status(500).send({ status: 'error', db: 'disconnected', message: error.message });
    }
  });

  // ─── Register Routes ───
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(rideRoutes, { prefix: '/rides' });
  await fastify.register(locationRoutes, { prefix: '/location' });
  await fastify.register(wsRoutes);

  // ─── Global Error Handler ───
  fastify.setErrorHandler((error: any, request, reply) => {
    fastify.log.error(error);
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.message,
      });
    }
    reply.status(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'Something went wrong',
    });
  });

  return fastify;
};
