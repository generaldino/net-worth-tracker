export interface LicensePlate {
  id: string;
  plateNumber: string;
  imageUrls: string[];
  createdAt: Date;
  country: string;
  caption: string;
  carMake: string;
  tags: string[];
  reporter: string;
  categoryId: string;
}
