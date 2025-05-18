import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  color: text("color").notNull().default("amber"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  flag: text("flag").notNull().default("🏳️"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const carMakes = pgTable("car_makes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  logoUrl: text("logo_url").notNull().default("🚗"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const licensePlates = pgTable("license_plates", {
  id: uuid("id").defaultRandom().primaryKey(),
  plateNumber: text("plate_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  countryId: uuid("country_id").references(() => countries.id),
  caption: text("caption").notNull(),
  imageUrls: text("image_urls").array().notNull(),
  tags: text("tags").array().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  carMakeId: uuid("car_make_id").references(() => carMakes.id),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  licensePlateId: uuid("license_plate_id")
    .notNull()
    .references(() => licensePlates.id),
  reportType: text("report_type").notNull(), // e.g., 'mismatch', 'inappropriate', 'other'
  description: text("description"),
  status: text("status").notNull().default("pending"), // 'pending', 'resolved', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
export type CarMake = typeof carMakes.$inferSelect;
export type NewCarMake = typeof carMakes.$inferInsert;
export type LicensePlate = typeof licensePlates.$inferSelect;
export type NewLicensePlate = typeof licensePlates.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
