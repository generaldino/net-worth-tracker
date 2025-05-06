import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, integer, uuid, date } from "drizzle-orm/pg-core";

export const licensePlates = pgTable("license_plates", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  imageUrls: text("image_urls").array().notNull(), // Correct array syntax
  dateAdded: date("date_added").notNull(),
  views: integer("views").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  tags: text("tags").array().notNull(), // Correct array syntax
  reporter: text("reporter").notNull(),
});

export type DbLicensePlate = InferSelectModel<typeof licensePlates>;
