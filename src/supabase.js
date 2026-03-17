import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://hieabwqqzzkatabmjndy.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZWFid3FxenprYXRhYm1qbmR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDc1MzcsImV4cCI6MjA4OTI4MzUzN30.Z3bujeg3FAKYg6D_4tuxFtGtD4btiEYBeb9oUDYh8Q8';

export const supabase = createClient(url, key);
