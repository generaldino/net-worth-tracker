export interface LicensePlate {
  id: string;
  plateNumber: string;
  imageUrls: string[];
  createdAt: Date | null;
  countryId: string | null;
  country?: string | null; // From database joins - populated by queries
  caption: string | null;
  carMakeId: string | null;
  carMake?: string | null; // From database joins - populated by queries
  reporter: string;
  userId: string;
  categoryId: string;
}
