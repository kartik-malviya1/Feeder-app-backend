import { FastifyInstance } from 'fastify';
import { AdminService } from '../services/admin.service.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  const adminService = new AdminService(fastify);

  // POST /admin/register — Register a new admin (Temporary)
  fastify.post('/register', async (request, reply) => {
    try {
      const result = await adminService.createAdmin(request.body);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /admin/seed — Auto-seed initial admin (Super Easy Setup)
  fastify.get('/seed', async (request, reply) => {
    try {
      const result = await adminService.createAdmin({
        name: 'Super Admin',
        email: 'admin@sawariauto.com',
        password: 'password123'
      });
      return reply.send({ message: 'Admin seeded successfully', credentials: { email: 'admin@sawariauto.com', password: 'password123' } });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // POST /admin/login — Login admin
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }
    try {
      const result = await adminService.login(email, password);
      return reply.send(result);
    } catch (error: any) {
      // Drizzle/DB errors usually aren't 401s, but credential errors are.
      // If the query failed, it's likely a 500 or 400.
      const status = error.message.includes('Failed query') ? 500 : 401;
      return reply.code(status).send({ error: error.message });
    }
  });

  // ─── Protected Routes ───
  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', fastify.authenticate);

    // GET /admin/drivers — Get all drivers
    protectedRoutes.get('/drivers', async (request, reply) => {
      try {
        const drivers = await adminService.getAllDrivers();
        return reply.send(drivers);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // POST /admin/drivers — Register a new driver
    protectedRoutes.post('/drivers', async (request, reply) => {
      try {
        const result = await adminService.createDriver(request.body);
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // GET /admin/drivers/pending — Get only pending drivers
    protectedRoutes.get('/drivers/pending', async (request, reply) => {
      try {
        const drivers = await adminService.getPendingDrivers();
        return reply.send(drivers);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // PATCH /admin/drivers/:id/approve — Approve a driver
    protectedRoutes.patch('/drivers/:id/approve', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await adminService.approveDriver(parseInt(id));
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // PATCH /admin/drivers/:id/disable — Disable an approved driver
    protectedRoutes.patch('/drivers/:id/disable', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await adminService.disableDriver(parseInt(id));
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // DELETE /admin/drivers/:id — Reject/Remove a driver
    protectedRoutes.delete('/drivers/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const result = await adminService.rejectDriver(parseInt(id));
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // POST /admin/flush — Clear database
    protectedRoutes.post('/flush', async (request, reply) => {
      try {
        const result = await adminService.flushDatabase();
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });

    // GET /admin/stats — Get dashboard stats
    protectedRoutes.get('/stats', async (request, reply) => {
      try {
        const stats = await adminService.getStats();
        return reply.send(stats);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    });
  });
}
