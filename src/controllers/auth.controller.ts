import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';

export const sendOtpSchema = z.object({
  phoneNumber: z.string().min(10),
  type: z.enum(['user', 'driver']),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(10),
  otp: z.string().min(4).max(6),
  type: z.enum(['user', 'driver']),
  verificationId: z.string(),
});

export const signupSchema = z.object({
  type: z.enum(['user', 'driver']),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().min(10),
  // Driver-specific (optional for initial signup)
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licensePhotoUrl: z.string().optional(),
  AadhaarCardPhotoUrl: z.string().optional(),
  photoUrl: z.string().optional(),
  rcPhotoUrl: z.string().optional(),
});

export class AuthController {
  private authService: AuthService;

  constructor(fastify: any) {
    this.authService = new AuthService(fastify);
  }

  async sendOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber, type } = sendOtpSchema.parse(request.body);
    try {
      const result = await this.authService.sendOtp(type, phoneNumber);
      return reply.send({
        message: 'OTP sent successfully',
        exists: result.exists,
        verificationId: result.verificationId,
      });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const { phoneNumber, otp, type, verificationId } = verifyOtpSchema.parse(request.body);
    try {
      const result = await this.authService.verifyOtp(type, phoneNumber, otp, verificationId);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async signup(request: FastifyRequest, reply: FastifyReply) {
    const data = signupSchema.parse(request.body);
    try {
      const result = await this.authService.signup(data.type, data);
      return reply.code(201).send({
        message: 'Account created successfully',
        token: result.token,
        user: result.user,
      });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
}
