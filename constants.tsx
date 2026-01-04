
import { Car, CarCategory, FuelType, Transmission } from './types';

export const BRANDS = ['Maruti', 'Tata', 'Hyundai', 'Mahindra', 'Kia', 'Toyota', 'Mercedes', 'BMW', 'Tesla'];

export const MOCK_CARS: Car[] = [
  {
    id: '1',
    name: 'Nexon EV',
    variant: 'Empowered Plus',
    brand: 'Tata',
    price: 1849000,
    emi: 28500,
    image: 'https://images.unsplash.com/photo-1695420999583-a9d702330f6d?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1695420999583-a9d702330f6d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c3d9?auto=format&fit=crop&q=80&w=800'
    ],
    category: CarCategory.ELECTRIC,
    fuel: FuelType.EV,
    transmission: Transmission.AUTOMATIC,
    mileage: '465 km/charge',
    engine: 'Electric Motor',
    seats: 5,
    safetyRating: '5 Star',
    location: 'Mumbai',
    // Fix: Corrected property name to dealer_id and added required status field
    dealer_id: 'dealer-1',
    status: 'available'
  },
  {
    id: '2',
    name: 'XUV700',
    variant: 'AX7 Luxury Pack',
    brand: 'Mahindra',
    price: 2699000,
    emi: 42000,
    image: 'https://images.unsplash.com/photo-1621236316799-342b58872b2c?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1621236316799-342b58872b2c?auto=format&fit=crop&q=80&w=800'
    ],
    category: CarCategory.NEW,
    fuel: FuelType.DIESEL,
    transmission: Transmission.AUTOMATIC,
    mileage: '15.5 kmpl',
    engine: '2.2L mHawk',
    seats: 7,
    safetyRating: '5 Star',
    location: 'Delhi',
    // Fix: Corrected property name to dealer_id and added required status field
    dealer_id: 'dealer-1',
    status: 'available'
  },
  {
    id: '3',
    name: 'City',
    variant: 'V i-VTEC',
    brand: 'Honda',
    price: 950000,
    emi: 14500,
    image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800',
    gallery: ['https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=800'],
    category: CarCategory.USED,
    fuel: FuelType.PETROL,
    transmission: Transmission.MANUAL,
    mileage: '17.8 kmpl',
    engine: '1.5L i-VTEC',
    seats: 5,
    safetyRating: '4 Star',
    year: 2021,
    km: 24000,
    owner: 1,
    location: 'Bangalore',
    // Fix: Corrected property name to dealer_id and added required status field
    dealer_id: 'dealer-2',
    status: 'available'
  },
  {
    id: '4',
    name: 'Model 3',
    variant: 'Performance',
    brand: 'Tesla',
    price: 7000000,
    emi: 95000,
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800',
    gallery: ['https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800'],
    category: CarCategory.ELECTRIC,
    fuel: FuelType.EV,
    transmission: Transmission.AUTOMATIC,
    mileage: '500 km/charge',
    engine: 'Dual Motor',
    seats: 5,
    safetyRating: '5 Star',
    location: 'Hyderabad',
    // Fix: Corrected property name to dealer_id and added required status field
    dealer_id: 'dealer-2',
    status: 'available'
  }
];

export const CATEGORIES = [CarCategory.NEW, CarCategory.USED, CarCategory.ELECTRIC];
