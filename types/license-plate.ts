export interface LicensePlate {
  id: string;
  plateNumber: string;
  imageUrls: string[];
  createdAt: Date | null;
  countryId: string | null;
  country?: string | null; // From database joins - populated by queries
  caption: string;
  carMake: string;
  tags: string[];
  reporter: string;
  userId: string;
  categoryId: string;
}
