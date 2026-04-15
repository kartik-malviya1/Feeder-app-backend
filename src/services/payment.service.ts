import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { rides, usersTable } from "../db/schema.js";
import {
  cashfreeRequest,
  getPublicBaseUrl,
} from "./cashfree.js";

export class PaymentService {
  constructor(private fastify: FastifyInstance) {}

  async createOrder(rideId: number, request: any) {
    const db = this.fastify.db;

    const ride = await db.query.rides.findFirst({
      where: eq(rides.id, rideId),
    });

    if (!ride) throw new Error("Ride not found");

    if (ride.paymentMode !== "ONLINE")
      throw new Error("Ride payment mode is not ONLINE");

    if (ride.paymentStatus === "PAID")
      throw new Error("Payment already completed");

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, ride.userId),
    });

    if (!user) throw new Error("User not found");

    const orderId = `ride_${rideId}_${Date.now()}`;
const phone = String(user.phoneNumber)
  .replace(/\D/g, "")
  .slice(-10);

if (phone.length !== 10) {
  throw new Error("Invalid customer phone number");
}

const publicBaseUrl = getPublicBaseUrl(request);
console.log("Public Base URL used for return_url:", publicBaseUrl);

  const cfOrder = await cashfreeRequest("/orders", "POST", {
  order_id: orderId,                    // ← Add this
  order_amount: Number(ride.price),
  order_currency: "INR",

  customer_details: {
    customer_id: String(user.id),
    customer_name: user.name || "Customer",
    customer_phone: phone,
    customer_email: user.email || `user${user.id}@example.com`,
  },

  order_meta: {
    return_url: `${publicBaseUrl}/payments/return?order_id={order_id}`,
  },
});

    await db
      .update(rides)
      .set({
        cfOrderId: orderId,
      })
      .where(eq(rides.id, rideId));
    return {
      paymentSessionId: cfOrder.payment_session_id,
      cfOrderId: orderId,
    };
  }

  async verifyPayment(orderId: string) {
    const db = this.fastify.db;

    const ride = await db.query.rides.findFirst({
      where: eq(rides.cfOrderId, orderId),
    });

    if (!ride)
      throw new Error("Ride not found");

    const cfOrder = await cashfreeRequest(
      `/orders/${orderId}`,
      "GET"
    );

    const isPaid =
      cfOrder.order_status === "PAID";

    await db
      .update(rides)
      .set({
        paymentStatus: isPaid
          ? "PAID"
          : "FAILED",
        paymentReferenceId: orderId,
      })
      .where(eq(rides.id, ride.id));

    return {
      status: isPaid ? "PAID" : "FAILED",
      orderId,
      amount: cfOrder.order_amount,
    };
  }
}