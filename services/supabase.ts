
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ywxskukvfzvrrefcbznu.supabase.co';
const supabaseAnonKey = 'sb_publishable_adVdicyHc-5LKxJ8Gh_9ig_BPii8hNQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Enhanced fetch helper to provide more descriptive error messages
 */
const safeFetch = async (query: any, errorMessage: string) => {
  try {
    const { data, error } = await query;
    if (error) {
      // Stringify error object to prevent [object Object] in logs
      console.error(`${errorMessage}:`, JSON.stringify(error, null, 2));
      throw new Error(error.message || errorMessage);
    }
    return data || [];
  } catch (err: any) {
    console.error(`Catch in ${errorMessage}:`, err.message || err);
    throw err;
  }
};

export const fetchAvailableCars = async () => {
  return safeFetch(
    supabase.from('cars').select('*').eq('status', 'available'),
    'Error fetching available cars'
  );
};

export const fetchAllCars = async () => {
  return safeFetch(
    supabase.from('cars').select('*'),
    'Error fetching all cars'
  );
};

export const fetchUserCars = async (dealerId: string) => {
  return safeFetch(
    supabase.from('cars').select('*').eq('dealer_id', dealerId),
    'Error fetching dealer cars'
  );
};

export const fetchAllUsers = async () => {
  return safeFetch(
    supabase.from('users').select('*'),
    'Error fetching all users'
  );
};

export const fetchAllDealers = async () => {
  return safeFetch(
    supabase.from('dealers').select('*'),
    'Error fetching all dealers'
  );
};

export const fetchUserBookings = async (userId: string) => {
  return safeFetch(
    supabase.from('bookings').select('*, cars(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    'Error fetching user bookings'
  );
};

export const fetchDealerBookings = async (dealerId: string) => {
  return safeFetch(
    supabase.from('bookings')
      .select('*, cars(*)')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false }),
    'Error fetching dealer bookings'
  );
};

export const fetchAllBookings = async () => {
  return safeFetch(
    supabase.from('bookings').select('*, cars(*), users(*)').order('created_at', { ascending: false }),
    'Error fetching all bookings'
  );
};

export const fetchBookingInvoices = async (bookingId: string) => {
  return safeFetch(
    supabase.from('invoices').select('*').eq('booking_id', bookingId),
    'Error fetching invoices'
  );
};

export const fetchAllInvoices = async () => {
  return safeFetch(
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    'Error fetching all invoices'
  );
};

export const recordPayment = async (paymentData: any) => {
  const { data, error } = await supabase.from('payments').insert([paymentData]);
  if (error) throw new Error(error.message);
  return data;
};

export const createBookingRecord = async (bookingData: any) => {
  const { data, error } = await supabase.from('bookings').insert([bookingData]).select();
  if (error) throw new Error(error.message);
  return data ? data[0] : null;
};

export const registerDealerInDb = async (dealerData: {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
}) => {
  const { data, error } = await supabase.from('dealers').insert([
    {
      id: dealerData.id,
      name: dealerData.name,
      owner_name: dealerData.owner_name,
      email: dealerData.email,
      phone: dealerData.phone,
      location: dealerData.location,
      is_approved: true,
      needs_password_change: true,
      created_at: new Date().toISOString()
    }
  ]);
  if (error) throw new Error(error.message);
  return data;
};

export const addCarListing = async (carData: any) => {
  const { data, error } = await supabase.from('cars').insert([carData]);
  if (error) throw new Error(error.message);
  return data;
};

export const updateCarDetails = async (carId: string, dealerId: string, carData: any) => {
  const { data, error } = await supabase
    .from('cars')
    .update(carData)
    .match({ id: carId, dealer_id: dealerId });
  if (error) throw new Error(error.message);
  return data;
};

export const updateCarStatus = async (carId: string, status: string) => {
  const { data, error } = await supabase
    .from('cars')
    .update({ status })
    .eq('id', carId);
  if (error) throw new Error(error.message);
  return data;
};
