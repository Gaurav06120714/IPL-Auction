import { pgTable, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const roomsTable = pgTable("rooms", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("waiting"),
  playersAuctioned: integer("players_auctioned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersTable = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  teamName: text("team_name").notNull(),
  balance: real("balance").notNull().default(10000),
  squadCount: integer("squad_count").notNull().default(0),
  isHost: boolean("is_host").notNull().default(false),
  socketId: text("socket_id"),
});

export const playersTable = pgTable("players", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  country: text("country").notNull(),
  category: text("category").notNull(),
  basePrice: real("base_price").notNull(),
  powerScore: integer("power_score").notNull(),
});

export const squadTable = pgTable("squad", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  roomId: text("room_id").notNull().references(() => roomsTable.id),
  playerId: integer("player_id").notNull().references(() => playersTable.id),
  pricePaid: real("price_paid").notNull(),
});

export const insertRoomSchema = createInsertSchema(roomsTable);
export const insertUserSchema = createInsertSchema(usersTable);
export const insertPlayerSchema = createInsertSchema(playersTable);
export const insertSquadSchema = createInsertSchema(squadTable);

export type Room = typeof roomsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type Player = typeof playersTable.$inferSelect;
export type SquadEntry = typeof squadTable.$inferSelect;
