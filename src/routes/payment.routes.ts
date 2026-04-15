import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const controller = new PaymentController(fastify);

  // ====================== PROTECTED ROUTES ======================
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/create-order', async (request, reply) => {
    return controller.createOrder(request, reply);
  });

  fastify.post('/verify', async (request, reply) => {
    return controller.verifyPayment(request, reply);
  });
}