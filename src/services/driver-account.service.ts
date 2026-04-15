import { and, eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { AutoRider, rides } from '../db/schema.js';

type DriverAccountProfile = {
  id: number;
  name: string;
  phoneNumber: string;
  vehicleNumber: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  status: 'OFFLINE' | 'ONLINE' | 'BUSY';
  rating: number | null;
  createdAt: string;
};

type DriverAccountStats = {
  completedTrips: number;
  totalAssignedTrips: number;
  lifetimeEarnings: number;
  yearsOnPlatform: number;
  completionRate: number | null;
};

export type DriverAccountResponse = {
  profile: DriverAccountProfile;
  stats: DriverAccountStats;
};

type UpdateDriverAccountInput = {
  name?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  photoUrl?: string;
};

export class DriverAccountService {
  constructor(private fastify: FastifyInstance) {}

  async getDriverAccount(driverId: number): Promise<DriverAccountResponse> {
    const db = this.fastify.db;

    const driver = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    const [completedTripsStats] = await db
      .select({
        count: sql<number>`count(*)`,
        earnings: sql<number>`coalesce(sum(${rides.price}), 0)`,
      })
      .from(rides)
      .where(and(eq(rides.autoRiderId, driverId), eq(rides.status, 'COMPLETED')));

    const [assignedTripsStats] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(rides)
      .where(eq(rides.autoRiderId, driverId));

    const completedTrips = Number(completedTripsStats?.count ?? 0);
    const totalAssignedTrips = Number(assignedTripsStats?.count ?? 0);
    const completionRate =
      totalAssignedTrips > 0 ? Math.round((completedTrips / totalAssignedTrips) * 100) : null;

    const now = new Date();
    const createdAt = driver.created_at;
    const yearDiff = now.getFullYear() - createdAt.getFullYear();
    const monthDiff = now.getMonth() - createdAt.getMonth();
    const totalMonths = Math.max(yearDiff * 12 + monthDiff, 0);
    const yearsOnPlatform = Number((totalMonths / 12).toFixed(1));

    return {
      profile: {
        id: driver.id,
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        vehicleNumber: driver.vehicleNumber ?? null,
        licenseNumber: driver.licenseNumber ?? null,
        photoUrl: driver.photoUrl ?? null,
        status: driver.status,
        rating: driver.rating ?? null,
        createdAt: driver.created_at.toISOString(),
      },
      stats: {
        completedTrips,
        totalAssignedTrips,
        lifetimeEarnings: Number(completedTripsStats?.earnings ?? 0),
        yearsOnPlatform,
        completionRate,
      },
    };
  }

  async updateDriverAccount(
    driverId: number,
    input: UpdateDriverAccountInput,
  ): Promise<DriverAccountProfile> {
    const db = this.fastify.db;

    const existing = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!existing) {
      throw new Error('Driver not found');
    }

    const updates: UpdateDriverAccountInput = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.vehicleNumber !== undefined) updates.vehicleNumber = input.vehicleNumber;
    if (input.licenseNumber !== undefined) updates.licenseNumber = input.licenseNumber;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    if (Object.keys(updates).length === 0) {
      throw new Error('No fields provided to update');
    }

    await db.update(AutoRider).set(updates).where(eq(AutoRider.id, driverId));

    const updated = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!updated) {
      throw new Error('Driver not found');
    }

    return {
      id: updated.id,
      name: updated.name,
      phoneNumber: updated.phoneNumber,
      vehicleNumber: updated.vehicleNumber ?? null,
      licenseNumber: updated.licenseNumber ?? null,
      photoUrl: updated.photoUrl ?? null,
      status: updated.status,
      rating: updated.rating ?? null,
      createdAt: updated.created_at.toISOString(),
    };
  }
}
