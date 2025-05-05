import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const licensePlates = pgTable("license_plates", {
  id: text("id").primaryKey(),
  plateNumber: text("plate_number").notNull(),
  imageUrls: text("image_urls").notNull(), // Stored as JSON string
  dateAdded: text("date_added").notNull(),
  views: integer("views").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  tags: text("tags").notNull(), // Stored as JSON string
  reporter: text("reporter").notNull(),
});
