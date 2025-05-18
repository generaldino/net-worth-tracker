export interface LicensePlate {
  id: string;
  plateNumber: string;
  imageUrls: string[];
  createdAt: Date | null;
  country: string;
  caption: string;
  carMake: string;
  tags: string[];
  reporter: string;
  userId: string;
  categoryId: string;
}
