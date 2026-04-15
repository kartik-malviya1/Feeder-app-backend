import { FastifyInstance } from 'fastify';
import { rides, AutoRider } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export class RideService {
  constructor(private fastify: FastifyInstance) {}

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  private haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const EARTH_RADIUS_KM = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  async createRideRequest(userId: number, rideData: any) {
    const db = this.fastify.db;
    const otp = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP
console.log("before db",rideData.pickupAddress, rideData.dropAddress);
    const [newRide] = await db.insert(rides).values({
      userId,
      pickupLocationLat: rideData.pickupLat,
      pickupLocationLng: rideData.pickupLng,
      dropLocationLat: rideData.dropLat,
      dropLocationLng: rideData.dropLng,
      otp,
       pickupAddress: rideData.pickupAddress,
  dropAddress: rideData.dropAddress,

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
      paymentMode: rideData.paymentMode || 'CASH',
      pickupAddress: rideData.pickupAddress || null,
      dropAddress: rideData.dropAddress || null,
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

  async updateRideStatus(rideId: number, status: 'STARTED' | 'COMPLETED' | 'CANCELLED', otp?: number) {
    const db = this.fastify.db;

    // Fetch ride details
    const ride = await db.query.rides.findFirst({ where: eq(rides.id, rideId) });
    if (!ride) {
      throw new Error('Ride not found');
    }

    // OTP Validation for starting a ride
    if (status === 'STARTED') {
      if (!otp) {
        throw new Error('OTP is required to start ride');
      }
      if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
      }
    }

    await db.update(rides)
      .set({
        status,
        startedAt: status === 'STARTED' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      })
      .where(eq(rides.id, rideId));

    // If ride ended, free the driver
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      if (ride.autoRiderId) {
        await db.update(AutoRider)
          .set({ status: 'ONLINE' })
          .where(eq(AutoRider.id, ride.autoRiderId));
      }
    }

    // ✅ Notify BOTH user and driver via WebSocket
    const userSocket = this.fastify.conns.getUserSocket(ride.userId);
    if (userSocket && userSocket.readyState === 1) {
      userSocket.send(JSON.stringify({
        event: `RIDE_${status}`,
        rideId,
      }));
    }

    if (ride.autoRiderId) {
      const driverSocket = this.fastify.conns.getDriverSocket(ride.autoRiderId);
      if (driverSocket && driverSocket.readyState === 1) {
        driverSocket.send(JSON.stringify({
          event: `RIDE_${status}`,
          rideId,
        }));
      }
    }

    return { success: true };
  }

  async getActiveRideForDriver(driverId: number) {
    const db = this.fastify.db;
    return await db.query.rides.findFirst({
      where: and(
        eq(rides.autoRiderId, driverId),
        inArray(rides.status, ['ACCEPTED', 'STARTED'])
      )
    });
  }

  async getNearbyRequestedRidesForDriver(
    driverId: number,
    options?: { radiusKm?: number; limit?: number },
  ) {
    const db = this.fastify.db;
    const radiusKm = options?.radiusKm ?? 6;
    const limit = options?.limit ?? 25;

    const driver = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    const requestedRides = await db.select().from(rides).where(eq(rides.status, 'REQUESTED'));

    const mapped = requestedRides
      .map((ride) => {
        const distanceKm =
          driver.currentLat != null &&
          driver.currentLng != null &&
          ride.pickupLocationLat != null &&
          ride.pickupLocationLng != null
            ? this.haversineDistanceKm(
              driver.currentLat,
              driver.currentLng,
              ride.pickupLocationLat,
              ride.pickupLocationLng,
            )
            : null;

        return {
          rideId: ride.id,
          pickup: { lat: ride.pickupLocationLat, lng: ride.pickupLocationLng },
          drop: { lat: ride.dropLocationLat, lng: ride.dropLocationLng },
          price: ride.price,
          paymentMode: (ride.paymentMode || 'CASH').toUpperCase(),
          distanceKm,
          createdAt: ride.created_at,
        };
      })
      .filter((ride) => ride.pickup.lat != null && ride.pickup.lng != null && ride.drop.lat != null && ride.drop.lng != null);

    const nearby = driver.currentLat != null && driver.currentLng != null
      ? mapped.filter((ride) => ride.distanceKm != null && ride.distanceKm <= radiusKm)
      : mapped;

    const sorted = nearby.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm;
      }
      return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt));
    });

    return sorted.slice(0, limit);
  }
}
