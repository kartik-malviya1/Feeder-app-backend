import { FastifyInstance } from 'fastify';
import { LocationController } from '../controllers/location.controller.js';

export default async function locationRoutes(fastify: FastifyInstance) {
  const controller = new LocationController(fastify);

  // POST /location/update
  // Body: { id: number, role: "user"|"driver", lat: number, lng: number }
  fastify.post('/update', async (request, reply) => {
    return controller.updateLocation(request, reply);
  });
}
