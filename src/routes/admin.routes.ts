import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdminService } from '../services/admin.service.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  const adminService = new AdminService(fastify);

  // GET /admin/drivers — Get all drivers
  fastify.get('/drivers', async (request, reply) => {
    try {
      const drivers = await adminService.getAllDrivers();
      return reply.send(drivers);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /admin/drivers/pending — Get only pending drivers
  fastify.get('/drivers/pending', async (request, reply) => {
    try {
      const drivers = await adminService.getPendingDrivers();
      return reply.send(drivers);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // PATCH /admin/drivers/:id/approve — Approve a driver
  fastify.patch('/drivers/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await adminService.approveDriver(parseInt(id));
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /admin/stats — Get dashboard stats
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await adminService.getStats();
      return reply.send(stats);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });
}
