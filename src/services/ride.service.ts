import { FastifyInstance } from 'fastify';
import { rides, AutoRider } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class RideService {
  constructor(private fastify: FastifyInstance) {}

  async createRideRequest(userId: number, rideData: any) {
    const db = this.fastify.db;
    const otp = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP

    const [newRide] = await db.insert(rides).values({
      userId,
      pickupLocationLat: rideData.pickupLat,
      pickupLocationLng: rideData.pickupLng,
      dropLocationLat: rideData.dropLat,
      dropLocationLng: rideData.dropLng,
      otp,
      status: 'REQUESTED',
      paymentMode: rideData.paymentMode || 'CASH',
      paymentStatus: 'PENDING',
      price: rideData.price || 0,
    });

    // Notify all online drivers about the new ride request
    this.fastify.conns.broadcastToDrivers({
      event: 'NEW_RIDE_REQUEST',
      rideId: newRide.insertId,
      pickup: { lat: rideData.pickupLat, lng: rideData.pickupLng },
      drop: { lat: rideData.dropLat, lng: rideData.dropLng },
      price: rideData.price,
    });

    return newRide.insertId;
  }

  async acceptRide(rideId: number, driverId: number) {
    const db = this.fastify.db;

    // Check if ride is still available
    const existingRide = await db.query.rides.findFirst({
      where: eq(rides.id, rideId),
    });

    if (!existingRide) {
      throw new Error('Ride not found');
    }
    if (existingRide.status !== 'REQUESTED') {
      throw new Error('Ride is no longer available');
    }

    // Update ride → ACCEPTED
    await db.update(rides)
      .set({
        autoRiderId: driverId,
        status: 'ACCEPTED',
      })
      .where(eq(rides.id, rideId));

    // Mark driver as BUSY
    await db.update(AutoRider)
      .set({ status: 'BUSY' })
      .where(eq(AutoRider.id, driverId));

    // Get driver info to send to user
    const driver = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    // ✅ Notify the user via WebSocket that their ride was accepted
    const userSocket = this.fastify.conns.getUserSocket(existingRide.userId);
    if (userSocket && userSocket.readyState === 1) {
      userSocket.send(JSON.stringify({
        event: 'RIDE_ACCEPTED',
        rideId,
        driverId,
        driverName: driver?.name || 'Driver',
        driverPhone: driver?.phoneNumber,
        vehicleNumber: driver?.vehicleNumber,
        otp: existingRide.otp,
      }));
    }

    return { success: true, otp: existingRide.otp };
  }

  async updateRideStatus(rideId: number, status: 'STARTED' | 'COMPLETED' | 'CANCELLED') {
    const db = this.fastify.db;

    await db.update(rides)
      .set({
        status,
        startedAt: status === 'STARTED' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      })
      .where(eq(rides.id, rideId));

    // If ride ended, free the driver
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      const ride = await db.query.rides.findFirst({ where: eq(rides.id, rideId) });
      if (ride?.autoRiderId) {
        await db.update(AutoRider)
          .set({ status: 'ONLINE' })
          .where(eq(AutoRider.id, ride.autoRiderId));
      }

      // Notify user the ride ended
      if (ride) {
        const userSocket = this.fastify.conns.getUserSocket(ride.userId);
        if (userSocket && userSocket.readyState === 1) {
          userSocket.send(JSON.stringify({
            event: status === 'COMPLETED' ? 'RIDE_COMPLETED' : 'RIDE_CANCELLED',
            rideId,
          }));
        }
      }
    }

    return { success: true };
  }

  async getRideStatus(rideId: number) {
    const db = this.fastify.db;
    return await db.select().from(rides).where(eq(rides.id, rideId)).then(r => r[0]);
  }
}
