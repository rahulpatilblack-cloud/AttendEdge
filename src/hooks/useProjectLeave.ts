// src/hooks/useProjectLeave.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface ProjectLeaveRequest {
  id: string;
  project_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  leave_types: {
    name: string;
  };
  projects: {
    name: string;
  };
}

export const useProjectLeave = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [pendingProjectLeaveRequests, setPendingProjectLeaveRequests] = useState<ProjectLeaveRequest[]>([]);
  const [projectLeaveBalances, setProjectLeaveBalances] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjectLeaveData = async () => {
    if (!user || !currentCompany) return;
    setIsLoading(true);

    try {
      // Fetch pending project leave requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('project_leave_requests')
        .select(`
          *,
          leave_types:leave_type_id (name),
          projects:project_id (name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Filter requests based on user role
      if (['admin', 'super_admin'].includes(user.role)) {
        // Admins see all pending requests
        setPendingProjectLeaveRequests(pendingRequests || []);
      } else if (user.role === 'reporting_manager') {
        // Managers see requests from their team
        const { data: teamMembers } = await supabase
          .from('employees')
          .select('id')
          .eq('reporting_manager_id', user.id);

        const teamIds = teamMembers?.map(member => member.id) || [];
        const filteredRequests = pendingRequests?.filter(request => 
          teamIds.includes(request.employee_id)
        ) || [];
        setPendingProjectLeaveRequests(filteredRequests);
      } else {
        // Regular employees see their own pending requests
        const employeeRequests = pendingRequests?.filter(
          request => request.employee_id === user.id
        ) || [];
        setPendingProjectLeaveRequests(employeeRequests);
      }

      // For now, we'll use a simple count of approved project leaves as balance
      // You can replace this with actual balance calculation based on your business logic
      const { count: leaveCount } = await supabase
        .from('project_leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'approved');

      setProjectLeaveBalances(10 - (leaveCount || 0)); // Assuming 10 days per year as an example

    } catch (error) {
      console.error('Error fetching project leave data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectLeaveData();
  }, [user, currentCompany]);

  return {
    pendingProjectLeaveRequests,
    projectLeaveBalances,
    isLoading,
    refresh: fetchProjectLeaveData
  };
};