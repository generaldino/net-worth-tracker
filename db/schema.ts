import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const licensePlates = pgTable("license_plates", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  country: text("country").notNull(),
  caption: text("caption").notNull(),
  imageUrls: text("image_urls").array().notNull(),
  tags: text("tags").array().notNull(),
  reporter: text("reporter").notNull(),
  carMake: text("car_make").notNull(),
  carModel: text("car_model").notNull(),
  category: text("category").notNull(),
  categoryEmoji: text("category_emoji").notNull(),
  userId: uuid("user_id"),
});

// Export type for use in application code
export type LicensePlate = typeof licensePlates.$inferSelect;
export type NewLicensePlate = typeof licensePlates.$inferInsert;
