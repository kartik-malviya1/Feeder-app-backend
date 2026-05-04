import { FastifyInstance } from 'fastify';
import { usersTable, AutoRider } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendOTPWithMessageCentral, verifyOTPWithMessageCentral, normalizeIndianPhone } from './message-central.js';

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Check if phone exists, send OTP via MessageCentral.
   */
  async sendOtp(type: 'user' | 'driver', phoneNumber: string) {
    const db = this.fastify.db;
    const table = type === 'user' ? usersTable : AutoRider;
    const normalizedPhone = normalizeIndianPhone(phoneNumber);

    // Check if phone number already exists
    const result = await db.select().from(table).where(
      eq(table.phoneNumber, normalizedPhone)
    );
    const exists = result.length > 0;

    // Send OTP via MessageCentral
    const verificationId = await sendOTPWithMessageCentral(normalizedPhone);

    this.fastify.log.info(`📱 OTP sent to ${normalizedPhone}, verificationId: ${verificationId}`);

    return { exists, verificationId };
  }

  /**
   * Verify OTP via MessageCentral. If user exists → return JWT. If not → return verified flag.
   */
  async verifyOtp(type: 'user' | 'driver', phoneNumber: string, otp: string, verificationId?: string) {
    if (!verificationId) {
      throw new Error('verificationId is required. Please request a new OTP.');
    }

    const normalizedPhone = normalizeIndianPhone(phoneNumber);

    // Verify OTP via MessageCentral
    await verifyOTPWithMessageCentral(verificationId, otp, normalizedPhone);

    const db = this.fastify.db;
    const table = type === 'user' ? usersTable : AutoRider;

    const result = await db.select().from(table).where(
      eq(table.phoneNumber, normalizedPhone)
    );
    const account = result[0];

    if (account) {
      // User exists → generate JWT and return it
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
    const normalizedPhone = normalizeIndianPhone(data.phoneNumber);

    let insertResult;
    if (type === 'user') {
      insertResult = await db.insert(usersTable).values({
        name: data.name,
        email: data.email || null,
        phoneNumber: normalizedPhone,
      });
    } else {
      insertResult = await db.insert(AutoRider).values({
        name: data.name,
        phoneNumber: normalizedPhone,
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
