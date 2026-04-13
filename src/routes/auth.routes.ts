import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController(fastify);

  // POST /auth/send-otp — Send OTP to phone number
  fastify.post('/send-otp', async (request, reply) => {
    return controller.sendOtp(request, reply);
  });

  // POST /auth/verify-otp — Verify OTP, return JWT if user exists
  fastify.post('/verify-otp', async (request, reply) => {
    return controller.verifyOtp(request, reply);
  });

  // POST /auth/signup — Create account (after OTP verification)
  fastify.post('/signup', async (request, reply) => {
    return controller.signup(request, reply);
  });
}
