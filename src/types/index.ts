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

export interface ProjectLeaveRequest {
  id: string;
  project_id: string;
  consultant_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  leave_type?: {
    id: string;
    name: string;
  };
}

export interface ProjectHoliday {
  id: string;
  project_id: string;
  date: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}
