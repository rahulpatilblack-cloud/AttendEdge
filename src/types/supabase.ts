// src/types/supabase.ts
import { Database } from '@/types/supabase-generated';

export type Project = Database['public']['Tables']['projects']['Row'];