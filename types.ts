
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
  dealer_id?: string;
  status: 'available' | 'sold' | 'booked' | 'pending';
}

export interface Booking {
  id: string;
  car_id: string;
  user_id: string;
  dealer_id: string;
  status: BookingStatus | string;
  created_at: string;
  token_paid: number;
  cars?: Car;
  users?: UserProfile;
}

export interface Payment {
  id: string;
  payment_id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed';
  user_id: string;
  dealer_id: string;
  car_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  payment_id: string;
  invoice_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_approved?: boolean;
  needs_password_change?: boolean;
  showroom_name?: string;
  owner_name?: string;
  status?: string;
}
