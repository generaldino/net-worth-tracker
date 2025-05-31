import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  isAdmin: text("is_admin").notNull().default("false"),
});

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
