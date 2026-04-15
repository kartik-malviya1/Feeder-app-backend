import { FastifyRequest } from "fastify";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg";

/**
 * Generic request helper
 */
export async function cashfreeRequest(
  path: string,
  method: "GET" | "POST",
  body?: unknown
) {
  const url = `${CASHFREE_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
 headers: {
  "Content-Type": "application/json",
  "x-api-version": process.env.CASHFREE_API_VERSION!,
  "x-client-id": process.env.CASHFREE_CLIENT_ID!,
  "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
},
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Cashfree Error:", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    throw new Error(data.message || data.error || "Cashfree request failed");
  }

  return data;
}

/**
 * Resolve public base URL
 */
export function getPublicBaseUrl(request?: FastifyRequest): string {
 

  if (!request) {
    return "http://192.168.1.2:3000";
  }

  const proto =
    request.headers["x-forwarded-proto"] ||
    request.protocol ||
    "http";

  const host =
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    "192.168.1.2:3000";

  return `${proto}://${host}`.replace(/\/+$/, "");
}