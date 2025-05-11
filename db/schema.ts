import { InferSelectModel } from "drizzle-orm";
import { pgTable, text, integer, uuid, date } from "drizzle-orm/pg-core";

export const licensePlates = pgTable("license_plates", {
  id: uuid("id").primaryKey().defaultRandom(),
  plateNumber: text("plate_number").notNull(),
  country: text("country").notNull(),
  caption: text("caption").notNull(),
  imageUrls: text("image_urls").array().notNull(),
  dateAdded: date("date_added").notNull(),
  views: integer("views").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  tags: text("tags").array().notNull(),
  reporter: text("reporter").notNull(),
  reporterProfilePicture: text("reporter_profile_picture").notNull(),
  carMake: text("car_make").notNull(),
  carModel: text("car_model").notNull(),
});

export type DbLicensePlate = InferSelectModel<typeof licensePlates>;
