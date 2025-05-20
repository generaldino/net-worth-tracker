import {
  type Category,
  type LicensePlate as DbLicensePlate,
} from "@/db/schema";

// Full license plate data with all required metadata
export interface LicensePlate extends DbLicensePlate {
  reporter: string;
  reporterAvatar?: string | null;
  // These fields are now fetched separately
  // imageUrls is no longer part of the base license plate
  // but is fetched separately through the images table
  carMake?: string;
}

// License plate list item with minimal data for the grid/list views
export interface LicensePlateListItem {
  id: string;
  plateNumber: string;
  createdAt: Date | string;
  caption?: string | null;
  reporter: string;
  reporterAvatar?: string | null;
  category?: Category | null;
}

// License plate submission form data
export interface LicensePlateFormData {
  plateNumber: string;
  countryId: string;
  carMakeId: string;
  categoryId: string;
  userId?: string;
  caption?: string;
  tagIds?: string[];
  images: File[];
}
