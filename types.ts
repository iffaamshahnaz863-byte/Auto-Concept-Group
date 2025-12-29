
export enum CarCategory {
  NEW = 'New Cars',
  USED = 'Used Cars',
  ELECTRIC = 'Electric Cars'
}

export enum FuelType {
  PETROL = 'Petrol',
  DIESEL = 'Diesel',
  EV = 'Electric',
  CNG = 'CNG'
}

export enum Transmission {
  MANUAL = 'Manual',
  AUTOMATIC = 'Automatic'
}

export enum UserRole {
  USER = 'USER',
  DEALER = 'DEALER',
  ADMIN = 'ADMIN'
}

export enum BookingStatus {
  CONFIRMED = 'Confirmed',
  TEST_DRIVE_COMPLETED = 'Test Drive Completed',
  DOCS_VERIFIED = 'Docs Verified',
  LOAN_APPROVED = 'Loan Approved',
  DELIVERY_SCHEDULED = 'Delivery Scheduled',
  DELIVERED = 'Delivered'
}

export interface Car {
  id: string;
  name: string;
  variant: string;
  brand: string;
  price: number;
  emi: number;
  image: string;
  gallery: string[];
  category: CarCategory;
  fuel: FuelType;
  transmission: Transmission;
  mileage: string;
  engine: string;
  seats: number;
  safetyRating: string;
  year?: number;
  km?: number;
  owner?: number;
  location: string;
  dealerId?: string;
}

export interface Booking {
  id: string;
  carId: string;
  userId: string;
  dealerId: string;
  status: BookingStatus;
  bookingDate: string;
  tokenPaid: number;
  isTestDrive?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isApprovedDealer?: boolean;
  showroomName?: string;
  documents?: {
    aadhaar?: string;
    pan?: string;
    license?: string;
  };
}
