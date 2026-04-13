import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RideService } from '../services/ride.service.js';

export const requestRideSchema = z.object({
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropLat: z.number(),
  dropLng: z.number(),
  price: z.number(),
  paymentMode: z.enum(['CASH', 'ONLINE']),
});

export const rideIdSchema = z.object({
  id: z.string().transform(val => parseInt(val)),
});

export const updateStatusSchema = z.object({
  status: z.enum(['STARTED', 'COMPLETED', 'CANCELLED']),
});

export class RideController {
  private rideService: RideService;

  constructor(fastify: any) {
    this.rideService = new RideService(fastify);
  }

  async requestRide(request: FastifyRequest, reply: FastifyReply) {
    const data = requestRideSchema.parse(request.body);
    const user = request.user;

    if (user.role !== 'user') {
      return reply.code(403).send({ error: 'Only users can request rides' });
    }

    const rideId = await this.rideService.createRideRequest(user.id, data);
    return reply.code(201).send({ message: 'Ride requested successfully', rideId });
  }

  async acceptRide(request: FastifyRequest, reply: FastifyReply) {
    const { id: rideId } = rideIdSchema.parse(request.params);
    const user = request.user;

    if (user.role !== 'driver') {
      return reply.code(403).send({ error: 'Only drivers can accept rides' });
    }

    try {
      const result = await this.rideService.acceptRide(rideId, user.id);
      return reply.send({ message: 'Ride accepted successfully', otp: result.otp });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async updateRideStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id: rideId } = rideIdSchema.parse(request.params);
    const { status } = updateStatusSchema.parse(request.body);

    const result = await this.rideService.updateRideStatus(rideId, status);
    return reply.send({ message: `Ride ${status.toLowerCase()} successfully`, ...result });
  }

  async getRideStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id: rideId } = rideIdSchema.parse(request.params);
    const ride = await this.rideService.getRideStatus(rideId);

    if (!ride) {
      return reply.code(404).send({ error: 'Ride not found' });
    }

    return reply.send(ride);
  }
}
