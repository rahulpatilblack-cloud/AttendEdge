export interface User {
  id: string;
  name: string;
  email: string;
  // Add other user properties as needed
}

export interface ProjectMember {
  user_id: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
  is_active?: boolean;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  client_name?: string;
  allocation_percentage: number;
  members?: ProjectMember[];
  created_at?: string;
  updated_at?: string;
}

export interface Consultant {
  id: string;
  name: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
}
