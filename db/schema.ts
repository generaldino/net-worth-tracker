import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  color: text("color").notNull().default("amber"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const licensePlates = pgTable("license_plates", {
  id: uuid("id").defaultRandom().primaryKey(),
  plateNumber: text("plate_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  country: text("country").notNull(),
  caption: text("caption").notNull(),
  imageUrls: text("image_urls").array().notNull(),
  tags: text("tags").array().notNull(),
  reporter: text("reporter").notNull(),
  carMake: text("car_make").notNull(),
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
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type LicensePlate = typeof licensePlates.$inferSelect;
export type NewLicensePlate = typeof licensePlates.$inferInsert;
