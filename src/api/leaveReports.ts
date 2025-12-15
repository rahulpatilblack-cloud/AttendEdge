// In src/api/leaveReports.ts
export const fetchLeaveReports = async (filters: Omit<LeaveFilters, 'page' | 'pageSize'>) => {
  const { data, error, count } = await supabase
    .from('project_leave_requests')
    .select(`
      id,
      start_date,
      end_date,
      total_days,
      status,
      reason,
      leave_type:leave_types(name),
      consultant:employees!fk_leave_consultant(name, email),
      project:projects(name, client_name, client)
    `, { count: 'exact' })
    .gte('start_date', format(new Date(Number(filters.year), Number(filters.month), 1), 'yyyy-MM-dd'))
    .lte('end_date', format(new Date(Number(filters.year), Number(filters.month) + 1, 0), 'yyyy-MM-dd'))
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching leave reports:', error);
    throw error;
  }

  return {
    data: (data || []).map(transformLeaveReport),
    total: count || 0,
  };
};

const transformLeaveReport = (item: any): LeaveReport => ({
  id: item.id,
  employee_name: item.consultant?.name || 'Unknown',
  employee_email: item.consultant?.email || '',
  client_name: item.project?.client_name || item.project?.client || '-', // Fallback to client if client_name doesn't exist
  project_name: item.project?.name || 'Unknown Project',
  start_date: item.start_date,
  end_date: item.end_date,
  total_days: item.total_days,
  hours: item.total_days * HOURS_PER_DAY,
  status: item.status,
  leave_type: item.leave_type?.name,
  reason: item.reason,
});