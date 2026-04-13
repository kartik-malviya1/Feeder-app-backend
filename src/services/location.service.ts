import { FastifyInstance } from 'fastify';
import { AutoRider, rides } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class LocationService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Update driver's current location in DB, then broadcast to the
   * user who has an active ride with this driver via WebSocket.
   */
  async updateDriverLocation(driverId: number, lat: number, lng: number) {
    const db = this.fastify.db;

    // 1. Persist location to DB
    await db.update(AutoRider)
      .set({ currentLat: lat, currentLng: lng })
      .where(eq(AutoRider.id, driverId));

    // 2. Find active ride for this driver (ACCEPTED or STARTED)
    const activeRide = await db.query.rides.findFirst({
      where: and(
        eq(rides.autoRiderId, driverId),
        // Only broadcasting for rides that are in progress
      ),
    });

    // 3. If there's an active ride, notify that specific user
    if (activeRide && (activeRide.status === 'ACCEPTED' || activeRide.status === 'STARTED')) {
      const userSocket = this.fastify.conns.getUserSocket(activeRide.userId);
      if (userSocket && userSocket.readyState === 1) {
        userSocket.send(JSON.stringify({
          event: 'DRIVER_LOCATION',
          rideId: activeRide.id,
          driverId,
          lat,
          lng,
        }));
      }
    }

    return { success: true };
  }
}
