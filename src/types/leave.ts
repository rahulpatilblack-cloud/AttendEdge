export type LeaveStatus = 'approved' | 'pending' | 'rejected';

export interface LeaveReport {
  id: string;
  employee_name: string;
  employee_email: string;
  client_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  hours: number;
  status: LeaveStatus;
  total_days: number;
  leave_type?: string;
  reason?: string;
}

export interface LeaveFilters {
  year: string;
  month: string;
  status: string;
  employeeSearch: string;
  clientSearch: string;
  page: number;
  pageSize: number;
}

export interface Summary {
  totalHours: number;
  employees: number;
  totalDays: number;
}