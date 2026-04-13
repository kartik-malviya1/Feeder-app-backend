import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: MySql2Database<typeof schema>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const pool = mysql.createPool(process.env.DATABASE_URL!);
  const db = drizzle(pool, { schema, mode: 'default' });

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});
