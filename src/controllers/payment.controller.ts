import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PaymentService } from '../services/payment.service.js';

export const createOrderSchema = z.object({
  rideId: z.number(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string(),
});

export class PaymentController {
  private paymentService: PaymentService;

  constructor(fastify: any) {
    this.paymentService = new PaymentService(fastify);
  }

  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const { rideId } = createOrderSchema.parse(request.body);

    try {
      const result = await this.paymentService.createOrder(rideId, request);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    const { orderId } = verifyPaymentSchema.parse(request.body);

    try {
      const result = await this.paymentService.verifyPayment(orderId);
      return reply.send(result);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
}
