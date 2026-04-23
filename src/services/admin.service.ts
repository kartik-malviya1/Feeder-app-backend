import { eq } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { AutoRider } from '../db/schema.js';

export class AdminService {
  constructor(private fastify: FastifyInstance) {}

  async getAllDrivers() {
    const db = this.fastify.db;
    const drivers = await db.query.AutoRider.findMany();
    return drivers;
  }

  async getPendingDrivers() {
    const db = this.fastify.db;
    const drivers = await db.query.AutoRider.findMany({
      where: eq(AutoRider.isApproved, false),
    });
    return drivers;
  }

  async approveDriver(driverId: number) {
    const db = this.fastify.db;
    const [updated] = await db
      .update(AutoRider)
      .set({ isApproved: true })
      .where(eq(AutoRider.id, driverId));
    
    return { success: true, message: 'Driver approved successfully' };
  }

  async getStats() {
    const db = this.fastify.db;
    const allDrivers = await db.query.AutoRider.findMany();
    
    const active = allDrivers.filter(d => d.status === 'ONLINE').length;
    const inactive = allDrivers.filter(d => d.status === 'OFFLINE').length;
    const pending = allDrivers.filter(d => !d.isApproved).length;
    const registered = allDrivers.length;

    return {
      activeDrivers: active,
      inactiveDrivers: inactive,
      registered: registered,
      pending: pending,
      tripsCompleted: 0, // Placeholder
      revenueK: 0, // Placeholder
    };
  }
}
