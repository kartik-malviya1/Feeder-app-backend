import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { AutoRider, rides } from '../db/schema.js';

type DriverHomeResponse = {
  driver: {
    id: number;
    name: string;
    status: 'OFFLINE' | 'ONLINE' | 'BUSY';
    rating: number | null;
    isApproved: boolean;
  };
  stats: {
    todayTrips: number;
    todayEarnings: number;
    lifetimeTrips: number;
    lifetimeEarnings: number;
    activeRideCount: number;
  };
};

export class DriverHomeService {
  constructor(private fastify: FastifyInstance) {}

  async getHomeData(driverId: number): Promise<DriverHomeResponse> {
    const db = this.fastify.db;

    const driver = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayStats] = await db
      .select({
        tripCount: sql<number>`count(*)`,
        earnings: sql<number>`coalesce(sum(${rides.price}), 0)`,
      })
      .from(rides)
      .where(
        and(
          eq(rides.autoRiderId, driverId),
          eq(rides.status, 'COMPLETED'),
          gte(rides.completedAt, startOfDay),
        ),
      );

    const [lifetimeStats] = await db
      .select({
        tripCount: sql<number>`count(*)`,
        earnings: sql<number>`coalesce(sum(${rides.price}), 0)`,
      })
      .from(rides)
      .where(and(eq(rides.autoRiderId, driverId), eq(rides.status, 'COMPLETED')));

    const [activeRideStats] = await db
      .select({
        activeRideCount: sql<number>`count(*)`,
      })
      .from(rides)
      .where(
        and(
          eq(rides.autoRiderId, driverId),
          inArray(rides.status, ['ACCEPTED', 'STARTED']),
        ),
      );

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        rating: driver.rating ?? null,
        isApproved: driver.isApproved,
      },
      stats: {
        todayTrips: Number(todayStats?.tripCount ?? 0),
        todayEarnings: Number(todayStats?.earnings ?? 0),
        lifetimeTrips: Number(lifetimeStats?.tripCount ?? 0),
        lifetimeEarnings: Number(lifetimeStats?.earnings ?? 0),
        activeRideCount: Number(activeRideStats?.activeRideCount ?? 0),
      },
    };
  }
}
