import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DriverAccountService } from '../services/driver-account.service.js';
import { DriverHomeService } from '../services/driver-home.service.js';

export default async function driverRoutes(fastify: FastifyInstance) {
  const driverHomeService = new DriverHomeService(fastify);
  const driverAccountService = new DriverAccountService(fastify);
  const updateAccountSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    vehicleNumber: z.string().min(4).max(20).optional(),
    licenseNumber: z.string().min(4).max(20).optional(),
    photoUrl: z.url().max(255).optional(),
  });

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /driver/home — Driver home screen live data
  fastify.get('/home', async (request, reply) => {
    const user = request.user;

    if (user.role !== 'driver') {
      return reply.code(403).send({ error: 'Only drivers can access this resource' });
    }

    try {
      const data = await driverHomeService.getHomeData(user.id);
      return reply.send(data);
    } catch (error: any) {
      if (error.message === 'Driver not found') {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(400).send({ error: error.message });
    }
  });

  // GET /driver/account — Driver account profile and stats
  fastify.get('/account', async (request, reply) => {
    const user = request.user;

    if (user.role !== 'driver') {
      return reply.code(403).send({ error: 'Only drivers can access this resource' });
    }

    try {
      const data = await driverAccountService.getDriverAccount(user.id);
      return reply.send(data);
    } catch (error: any) {
      if (error.message === 'Driver not found') {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(400).send({ error: error.message });
    }
  });

  // PATCH /driver/account — Update driver account profile
  fastify.patch('/account', async (request, reply) => {
    const user = request.user;

    if (user.role !== 'driver') {
      return reply.code(403).send({ error: 'Only drivers can access this resource' });
    }

    try {
      const parsed = updateAccountSchema.parse(request.body ?? {});
      const payload = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => value !== undefined),
      ) as z.infer<typeof updateAccountSchema>;

      const updatedProfile = await driverAccountService.updateDriverAccount(user.id, payload);
      return reply.send({
        message: 'Account updated successfully',
        profile: updatedProfile,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Invalid account payload' });
      }

      if (error.message === 'Driver not found') {
        return reply.code(404).send({ error: error.message });
      }

      return reply.code(400).send({ error: error.message });
    }
  });
}
