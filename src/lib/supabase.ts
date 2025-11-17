import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://psankgxevxiiyclrzntp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzYW5rZ3hldnhpaXljbHJ6bnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA4NDAsImV4cCI6MjA3NjgxNjg0MH0.2-PDitmp85pNoWxrDIJ-V2ImNYCnryGZukxYeF1C_p8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true
  }
})
