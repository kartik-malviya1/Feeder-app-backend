import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { LocationService } from '../services/location.service.js';

export const locationUpdateSchema = z.object({
  id: z.number(),
  role: z.enum(['user', 'driver']),
  lat: z.number(),
  lng: z.number(),
});

export class LocationController {
  private locationService: LocationService;

  constructor(fastify: any) {
    this.locationService = new LocationService(fastify);
  }

  async updateLocation(request: FastifyRequest, reply: FastifyReply) {
    const data = locationUpdateSchema.parse(request.body);

    if (data.role === 'driver') {
      // Driver: frequent updates — save to DB + broadcast to user
      const result = await this.locationService.updateDriverLocation(data.id, data.lat, data.lng);
      return reply.send(result);
    }

    // User: one-time send — for MVP we just acknowledge it
    // (pickup location is already stored when ride is created)
    return reply.send({
      success: true,
      message: 'User location received (pickup location is set when ride is created)',
    });
  }
}
