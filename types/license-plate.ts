export interface LicensePlate {
  id: string;
  plateNumber: string;
  caption?: string;
  imageUrls: string[];
  dateAdded: string;
  views: number;
  shares: number;
  tags: string[];
  reporter: string;
  reporterProfilePicture?: string;
}
