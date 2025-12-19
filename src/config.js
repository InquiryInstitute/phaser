// Configuration for Supabase and API endpoints
// Using existing Supabase setup from Inquiry.Institute

export const config = {
  // Supabase project URL (from Inquiry.Institute)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://xougqdomkoisrxdnagcj.supabase.co',
  
  // Supabase anon key (safe to expose in client)
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1Zt0VjMX57VdYC7dH-GG1A_RFZyuwc9',
  
  // API endpoint for faculty chat (Supabase Edge Function)
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || 'https://xougqdomkoisrxdnagcj.supabase.co/functions/v1/faculty-chat',
}
