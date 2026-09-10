// Royal Barbershop — configuration
// This is the only file you should need to touch when moving to a new
// Supabase project, or changing the shop's operating hours.

const SUPABASE_URL = 'https://rxzxwrfksfroyasaomdp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4enh3cmZrc2Zyb3lhc2FvbWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDI1NDksImV4cCI6MjEwNDQxODU0OX0._zSg4QvYfqeUUToZpKV5ANQqA78KZFahrcp9bljEHyQ';

// Shop hours, 24-hour clock. Matches "Mon–Sun, 9:00 AM – 8:00 PM".
const SHOP_HOURS = { start: 9, end: 20 };

// Single resident barber (no barbers table yet — update here if that changes)
const BARBER_NAME = '1 Resident Master Barber';
