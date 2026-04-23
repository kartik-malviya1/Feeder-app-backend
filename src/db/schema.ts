import { bigint, boolean, float, int, mysqlEnum, mysqlTable, serial, timestamp, varchar } from 'drizzle-orm/mysql-core';

// ================= USERS =================
export const usersTable = mysqlTable('users_table', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).unique(),
  phoneNumber: varchar({ length: 20 }).notNull(),
  deviceId: varchar({ length: 255 }),
  expoToken: varchar({ length: 255 }),
  lastLogin: timestamp("lastlogin"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ================= ENUMS =================
export const rideStatusEnum = mysqlEnum('ride_status', [
  'REQUESTED',
  'ACCEPTED',
  'STARTED',
  'COMPLETED',
  'CANCELLED'
]);

export const driverStatusEnum = mysqlEnum('driver_status', [
  'OFFLINE',
  'ONLINE',
  'BUSY'
]);

// ================= DRIVERS =================
export const AutoRider = mysqlTable('auto_rider', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  phoneNumber: varchar({ length: 20 }).notNull(),
  vehicleNumber: varchar({ length: 20 }),
  licenseNumber: varchar({ length: 20 }),
  licensePhotoUrl: varchar({ length: 255 }),
  AadhaarCardPhotoUrl: varchar({ length: 255 }),
  photoUrl: varchar({ length: 255 }),
  lastLogin: timestamp("lastlogin"),
  status: driverStatusEnum.notNull(),
  rating: float(),
  isApproved: boolean().default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  currentLat: float(),
  currentLng: float(),
});

// ================= RIDES =================
export const rides = mysqlTable('rides', {
  id: serial().primaryKey(),

  userId: bigint({ mode: 'number', unsigned: true }).notNull().references(() => usersTable.id),
  autoRiderId: bigint({ mode: 'number', unsigned: true }).references(() => AutoRider.id),

  pickupLocationLat: float().notNull(),
  pickupLocationLng: float().notNull(),

  dropLocationLat: float(),
  dropLocationLng: float(),

   pickupAddress: varchar({ length: 255 }),
  dropAddress: varchar({ length: 255 }),

  otp: int().notNull(),
  status: rideStatusEnum.notNull(),

  // 💰 payment
  paymentMode: varchar({ length: 20 }).notNull(),
  paymentStatus: varchar({ length: 20 }).notNull(),
  paymentUTR: varchar({ length: 255 }),
  paymentReferenceId: varchar({ length: 255 }),
  price: float().notNull(),


  // ⏱ lifecycle (NEW)
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  distance: float(),   // in km
  duration: int(),     // in seconds

  cfOrderId: varchar("cf_order_id", { length: 255 }),

  created_at: timestamp("created_at").defaultNow().notNull(),
});