export interface LicensePlate {
  id: string;
  plateNumber: string;
  country: string;
  caption: string;
  imageUrls: string[];
  createdAt: Date | null;
  tags: string[];
  reporter: string;
  carMake: string;
  carModel: string;
  category: string;
  categoryEmoji: string;
}
