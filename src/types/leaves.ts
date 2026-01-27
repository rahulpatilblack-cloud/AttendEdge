export type LeaveType = 'full_day' | 'half_day' | 'partial';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface ProjectLeave {
  id: string;
  consultant_id: string;
  project_id: string;
  date: string; // ISO date string
  hours: number;
  type: LeaveType;
  status: LeaveStatus;
  notes: string | null;
  created_by: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface ProjectLeaveInput {
  consultant_id: string;
  project_id: string;
  date: string;
  hours: number;
  type: LeaveType;
  notes?: string;
  status?: LeaveStatus;
}

export interface ProjectLeaveUpdate extends Partial<ProjectLeaveInput> {
  id: string;
  status?: LeaveStatus;
  notes?: string;
}

export interface ConsultantProject {
  id: string;
  consultant_id: string;
  project_id: string;
  start_date: string;
  end_date: string | null;
  role: string | null;
  is_active: boolean;
  status: 'active' | 'inactive' | 'on_hold' | 'completed';
  allocation_percentage: number;
  allocated_hours: number;
  allocated_leave_hours: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}