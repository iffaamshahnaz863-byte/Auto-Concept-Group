
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ywxskukvfzvrrefcbznu.supabase.co';
const supabaseAnonKey = 'sb_publishable_adVdicyHc-5LKxJ8Gh_9ig_BPii8hNQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Real Data Fetching Helpers ---

export const fetchAvailableCars = async () => {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('status', 'available');
  if (error) throw error;
  return data || [];
};

export const fetchAllCars = async () => {
  const { data, error } = await supabase.from('cars').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchAllUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchAllDealers = async () => {
  const { data, error } = await supabase.from('dealers').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchUserBookings = async (userId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      cars (*)
    `)
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

export const fetchDealerBookings = async (dealerId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      cars (*)
    `)
    .eq('dealer_id', dealerId);
  if (error) throw error;
  return data || [];
};

export const fetchAllBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      cars (*),
      users (*)
    `);
  if (error) throw error;
  return data || [];
};

export const createBookingRecord = async (bookingData: any) => {
  const { data, error } = await supabase.from('bookings').insert([bookingData]);
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return data;
};
