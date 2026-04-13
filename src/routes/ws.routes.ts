import { FastifyInstance } from 'fastify';
import { AutoRider, rides } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export default async function wsRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info('New WebSocket connection');

    connection.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          // ─── Client registers itself ───
          case 'REGISTER':
            if (data.role === 'user') {
              fastify.conns.registerUser(data.id, connection);
            } else if (data.role === 'driver') {
              fastify.conns.registerDriver(data.id, connection);
            }
            connection.send(JSON.stringify({ type: 'REGISTERED', id: data.id, role: data.role }));
            break;

          // ─── Driver sends live location ───
          case 'LOCATION_UPDATE':
            if (data.role === 'driver') {
              // 1. Persist to DB
              await fastify.db.update(AutoRider)
                .set({ currentLat: data.lat, currentLng: data.lng })
                .where(eq(AutoRider.id, data.id));

              // 2. Find active ride for this driver
              const activeRide = await fastify.db.query.rides.findFirst({
                where: and(
                  eq(rides.autoRiderId, data.id),
                ),
              });

              // 3. Forward to user if they have an active ride
              if (activeRide && (activeRide.status === 'ACCEPTED' || activeRide.status === 'STARTED')) {
                const userSocket = fastify.conns.getUserSocket(activeRide.userId);
                if (userSocket && userSocket.readyState === 1) {
                  userSocket.send(JSON.stringify({
                    event: 'DRIVER_LOCATION',
                    rideId: activeRide.id,
                    driverId: data.id,
                    lat: data.lat,
                    lng: data.lng,
                  }));
                }
              }

              fastify.log.info(`Driver ${data.id} → ${data.lat}, ${data.lng}`);
            }
            break;

          // ─── Keep-alive ───
          case 'PING':
            connection.send(JSON.stringify({ type: 'PONG' }));
            break;
        }
      } catch (err) {
        fastify.log.error(err);
      }
    });

    connection.on('close', () => {
      fastify.log.info('WebSocket connection closed');
    });
  });
}
