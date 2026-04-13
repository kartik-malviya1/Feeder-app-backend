import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';

// Simple in-memory registry for active connections
export class ConnectionManager {
  private users = new Map<number, WebSocket>();
  private drivers = new Map<number, WebSocket>();

  registerUser(id: number, socket: WebSocket) {
    this.users.set(id, socket);
    socket.on('close', () => this.users.delete(id));
  }

  registerDriver(id: number, socket: WebSocket) {
    this.drivers.set(id, socket);
    socket.on('close', () => this.drivers.delete(id));
  }

  getUserSocket(id: number) {
    return this.users.get(id);
  }

  getDriverSocket(id: number) {
    return this.drivers.get(id);
  }

  broadcastToDrivers(message: any) {
    const data = JSON.stringify(message);
    this.drivers.forEach(conn => {
      if (conn.readyState === 1) { // 1 is OPEN for standard WebSocket
        conn.send(data);
      }
    });
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    conns: ConnectionManager;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyWebsocket);
  fastify.decorate('conns', new ConnectionManager());
});
