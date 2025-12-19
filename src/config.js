// Configuration for Supabase and API endpoints
// Update these with your actual Supabase project URL

export const config = {
  // Supabase project URL (get from Supabase dashboard)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  
  // Supabase anon key (safe to expose in client)
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // API endpoint for faculty chat
  // In production, this should point to your Supabase Edge Function
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '/api/faculty/chat',
  
  // Fallback: if edge function not available, use direct Supabase
  useDirectSupabase: import.meta.env.VITE_USE_DIRECT_SUPABASE === 'true',
}
