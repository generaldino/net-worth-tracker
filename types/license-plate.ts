export interface LicensePlate {
  id: string;
  plateNumber: string;
  country: string;
  caption: string;
  imageUrls: string[];
  dateAdded: string;
  views: number;
  shares: number;
  tags: string[];
  reporter: string;
  reporterProfilePicture?: string;
  carMake: string;
  carModel: string;
}
