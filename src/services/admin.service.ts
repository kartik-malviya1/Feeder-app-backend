import { eq, sql } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';
import { AutoRider, adminsTable, rides, usersTable } from '../db/schema.js';
import bcrypt from 'bcrypt';

export class AdminService {
  constructor(private fastify: FastifyInstance) {}

  async createAdmin(data: any) {
    const db = this.fastify.db;
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const [result] = await db.insert(adminsTable).values({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });
    
    return { success: true, message: 'Admin created successfully' };
  }

  async login(email: string, password: string) {
    const db = this.fastify.db;
    const admin = await db.query.adminsTable.findFirst({
      where: eq(adminsTable.email, email),
    });

    if (!admin) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = this.fastify.jwt.sign({
      id: admin.id,
      name: admin.name,
      role: 'admin'
    });

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    };
  }

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

    // Check driver exists first
    const driver = await db.query.AutoRider.findFirst({
      where: eq(AutoRider.id, driverId),
    });

    if (!driver) {
      throw new Error(`Driver with id ${driverId} not found`);
    }

    try {
      console.log(`[AdminService] Approving driver: ${driverId}`);
      
      const [result] = await db
        .update(AutoRider)
        .set({ isApproved: true })
        .where(sql`${AutoRider.id} = ${driverId}`);
      
      if ((result as any).affectedRows === 0) {
        console.warn(`[AdminService] No driver found with ID: ${driverId}`);
        throw new Error(`Driver with id ${driverId} not found`);
      }

      return { success: true, message: 'Driver approved successfully', driverId };
    } catch (error: any) {
      console.error(`[AdminService] Approval failed for driver ${driverId}:`, error);
      throw error;
    }
  }

  async disableDriver(driverId: number) {
    const db = this.fastify.db;
    try {
      console.log(`[AdminService] Disabling driver: ${driverId}`);
      const [result] = await db
        .update(AutoRider)
        .set({ isApproved: false, status: 'OFFLINE' })
        .where(sql`${AutoRider.id} = ${driverId}`);
      
      if ((result as any).affectedRows === 0) {
        throw new Error(`Driver with id ${driverId} not found`);
      }

      return { success: true, message: 'Driver disabled and moved to pending', driverId };
    } catch (error: any) {
      console.error(`[AdminService] Disabling failed for driver ${driverId}:`, error);
      throw error;
    }
  }

  async createDriver(data: any) {
    const db = this.fastify.db;
    
    const [result] = await db.insert(AutoRider).values({
      name: data.name,
      phoneNumber: data.phoneNumber,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      licensePhotoUrl: data.licensePhotoUrl,
      rcPhotoUrl: data.rcPhotoUrl,
      AadhaarCardPhotoUrl: data.AadhaarCardPhotoUrl,
      photoUrl: data.photoUrl,
      status: 'OFFLINE',
      isApproved: false,
    });
    
    return { 
      success: true, 
      message: 'Driver registered successfully',
      driverId: result.insertId 
    };
  }

  async rejectDriver(driverId: number) {
    const db = this.fastify.db;
    
    // Delete associated rides first to avoid foreign key constraints
    await db.delete(rides).where(eq(rides.autoRiderId, driverId));
    
    // Now delete the driver
    await db.delete(AutoRider).where(eq(AutoRider.id, driverId));
    
    return { success: true, message: 'Driver application rejected and removed' };
  }

  async flushDatabase() {
    const db = this.fastify.db;
    await db.delete(rides);
    await db.delete(AutoRider);
    await db.delete(usersTable);
    return { success: true, message: 'Database flushed successfully' };
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
