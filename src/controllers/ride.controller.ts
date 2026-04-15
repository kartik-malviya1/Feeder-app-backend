import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { RideService } from "../services/ride.service.js";
import { rides, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const requestRideSchema = z.object({
  pickupLat: z.number(),
  pickupLng: z.number(),
  dropLat: z.number(),
  dropLng: z.number(),

  pickupAddress: z.string(),
  dropAddress: z.string(),

  price: z.number(),
  paymentMode: z.enum(["CASH", "ONLINE"]),
});

export const rideIdSchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

export const updateStatusSchema = z.object({
  status: z.enum(["STARTED", "COMPLETED", "CANCELLED"]),
  otp: z.number().optional(),
});

export const nearbyRideQuerySchema = z.object({
  radiusKm: z.coerce.number().min(0.5).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class RideController {
  private rideService: RideService;

  constructor(fastify: any) {
    this.rideService = new RideService(fastify);
  }

  async requestRide(request: FastifyRequest, reply: FastifyReply) {
    const data = requestRideSchema.parse(request.body);
    const user = request.user;

    if (user.role !== "user") {
      return reply.code(403).send({ error: "Only users can request rides" });
    }

    const rideId = await this.rideService.createRideRequest(user.id, data);
    return reply
      .code(201)
      .send({ message: "Ride requested successfully", rideId });
  }

  async acceptRide(request: FastifyRequest, reply: FastifyReply) {
    const { id: rideId } = rideIdSchema.parse(request.params);
    const user = request.user;

    if (user.role !== "driver") {
      return reply.code(403).send({ error: "Only drivers can accept rides" });
    }

    try {
      const result = await this.rideService.acceptRide(rideId, user.id);
      return reply.send({
        message: "Ride accepted successfully",
        otp: result.otp,
      });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async updateRideStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id: rideId } = rideIdSchema.parse(request.params);
    const { status, otp } = updateStatusSchema.parse(request.body);

    try {
      const result = await this.rideService.updateRideStatus(
        rideId,
        status,
        otp,
      );
      return reply.send({
        message: `Ride ${status.toLowerCase()} successfully`,
        ...result,
      });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async getActiveRide(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (user.role !== "driver") {
      return reply
        .code(403)
        .send({ error: "Only drivers can check their active rides" });
    }

    const ride = await this.rideService.getActiveRideForDriver(user.id);
    if (!ride) {
      return reply.send({ message: "No active ride found" });
    }

    return reply.send(ride);
  }

  async getRideStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id: rideId } = rideIdSchema.parse(request.params);
  const db = request.server.db;

  const result = await db
    .select({
      ride: rides,
      userName: usersTable.name, // 👈 only fetch name
    })
    .from(rides)
    .leftJoin(usersTable, eq(rides.userId, usersTable.id))
    .where(eq(rides.id, rideId))
    .limit(1);

  if (!result.length) {
    return reply.code(404).send({ error: "Ride not found" });
  }

  return reply.send(result[0]);
}

  async getNearbyRequests(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (user.role !== "driver") {
      return reply
        .code(403)
        .send({ error: "Only drivers can view nearby ride requests" });
    }

    try {
      const { radiusKm, limit } = nearbyRideQuerySchema.parse(
        request.query ?? {},
      );
      const rides = await this.rideService.getNearbyRequestedRidesForDriver(
        user.id,
        { radiusKm, limit },
      );
      return reply.send({ rides });
    } catch (error: any) {
      return reply
        .code(400)
        .send({
          error: error.message || "Failed to fetch nearby ride requests",
        });
    }
  }
}
