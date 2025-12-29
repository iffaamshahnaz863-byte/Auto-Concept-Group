
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ywxskukvfzvrrefcbznu.supabase.co';
const supabaseAnonKey = 'sb_publishable_adVdicyHc-5LKxJ8Gh_9ig_BPii8hNQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCars = async () => {
  const { data, error } = await supabase.from('cars').select('*');
  if (error) throw error;
  return data;
};

export const getBookings = async (userId: string, role: string) => {
  let query = supabase.from('bookings').select('*, cars(*)');
  if (role === 'user') {
    query = query.eq('user_id', userId);
  } else if (role === 'dealer') {
    query = query.eq('dealer_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createBooking = async (bookingData: any) => {
  const { data, error } = await supabase.from('bookings').insert([bookingData]);
  if (error) throw error;
  return data;
};
