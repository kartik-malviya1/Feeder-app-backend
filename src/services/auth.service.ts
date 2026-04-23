import { FastifyInstance } from 'fastify';
import { usersTable, AutoRider } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// In-memory OTP store (MVP only — replace with Redis/Twilio in production)
const otpStore = new Map<string, { otp: string; exists: boolean; expiresAt: number }>();

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Check if phone exists, generate OTP, store in memory.
   */
  async sendOtp(type: 'user' | 'driver', phoneNumber: string) {
    const db = this.fastify.db;
    const table = type === 'user' ? usersTable : AutoRider;

    // Check if phone number already exists
    const result = await db.select().from(table).where(
      eq(table.phoneNumber, phoneNumber)
    );
    const exists = result.length > 0;

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Store with 5-minute expiry
    otpStore.set(`${type}:${phoneNumber}`, {
      otp,
      exists,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Log to console (MVP — replace with SMS service in production)
    this.fastify.log.info(`📱 OTP for ${phoneNumber}: ${otp}`);

    return { exists };
  }

  /**
   * Verify OTP. If user exists → return JWT. If not → return verified flag.
   */
  async verifyOtp(type: 'user' | 'driver', phoneNumber: string, otp: string) {
    const key = `${type}:${phoneNumber}`;
    const stored = otpStore.get(key);

    if (!stored) {
      throw new Error('OTP not found. Please request a new one.');
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      throw new Error('OTP expired. Please request a new one.');
    }

    if (stored.otp !== otp) {
      throw new Error('Invalid OTP.');
    }

    // OTP is valid — clean up
    otpStore.delete(key);

    if (stored.exists) {
      // User exists → generate JWT and return it
      const db = this.fastify.db;
      const table = type === 'user' ? usersTable : AutoRider;

      const result = await db.select().from(table).where(
        eq(table.phoneNumber, phoneNumber)
      );
      const account = result[0];

      const token = this.fastify.jwt.sign({
        id: account.id,
        role: type,
        name: account.name,
      });

      return {
        verified: true,
        exists: true,
        token,
        user: { id: account.id, name: account.name, role: type },
      };
    }

    // User doesn't exist → just confirm OTP was valid
    return { verified: true, exists: false };
  }

  /**
   * Create a new account and return JWT (auto-login after signup).
   */
  async signup(type: 'user' | 'driver', data: any) {
    const db = this.fastify.db;

    let insertResult;
    if (type === 'user') {
      insertResult = await db.insert(usersTable).values({
        name: data.name,
        email: data.email || null,
        phoneNumber: data.phoneNumber,
      });
    } else {
      insertResult = await db.insert(AutoRider).values({
        name: data.name,
        phoneNumber: data.phoneNumber,
        vehicleNumber: data.vehicleNumber,
        licenseNumber: data.licenseNumber,
        licensePhotoUrl: data.licensePhotoUrl,
        rcPhotoUrl: data.rcPhotoUrl,
        AadhaarCardPhotoUrl: data.AadhaarCardPhotoUrl,
        photoUrl: data.photoUrl,
        status: 'OFFLINE',
        isApproved: false,
      });
    }

    const insertId = (insertResult as any)[0]?.insertId;

    // Auto-login: generate JWT
    const token = this.fastify.jwt.sign({
      id: insertId,
      role: type,
      name: data.name,
    });

    return {
      token,
      user: { id: insertId, name: data.name, role: type },
    };
  }

  async adminLogin(password: string) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'sawari-admin-2026';
    
    if (password !== adminPassword) {
      throw new Error('Invalid admin password');
    }

    const token = this.fastify.jwt.sign({
      id: 0,
      role: 'admin',
      name: 'Sawari Admin',
    });

    return {
      token,
      user: { id: 0, name: 'Sawari Admin', role: 'admin' },
    };
  }
}
