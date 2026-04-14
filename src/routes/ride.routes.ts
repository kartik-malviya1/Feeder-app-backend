import { FastifyInstance } from 'fastify';
import { RideController } from '../controllers/ride.controller.js';

export default async function rideRoutes(fastify: FastifyInstance) {
  const controller = new RideController(fastify);

  // All ride routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /rides/request — User requests a ride
  fastify.post('/request', async (request, reply) => {
    return controller.requestRide(request, reply);
  });

  // PATCH /rides/:id/accept — Driver accepts a ride
  fastify.patch('/:id/accept', async (request, reply) => {
    return controller.acceptRide(request, reply);
  });

  // PATCH /rides/:id/status — Update ride status (start/complete/cancel)
  fastify.patch('/:id/status', async (request, reply) => {
    return controller.updateRideStatus(request, reply);
  });

  // GET /rides/:id/status — Get ride status
  fastify.get('/:id/status', async (request, reply) => {
    return controller.getRideStatus(request, reply);
  });

  // GET /rides/active — Get active ride for driver
  fastify.get('/active', async (request, reply) => {
    return controller.getActiveRide(request, reply);
  });
}
