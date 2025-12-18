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

interface ProjectLeaveMetrics {
  totalThisMonth: number;
  pendingCount: number;
  approvedCount: number;
  teamPendingCount: number;
}

export const useProjectLeave = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [pendingProjectLeaveRequests, setPendingProjectLeaveRequests] = useState<ProjectLeaveRequest[]>([]);
  const [projectLeaveBalances, setProjectLeaveBalances] = useState<number>(0);
  const [leaveMetrics, setLeaveMetrics] = useState<ProjectLeaveMetrics>({
    totalThisMonth: 0,
    pendingCount: 0,
    approvedCount: 0,
    teamPendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjectLeaveData = async () => {
    if (!user || !currentCompany) return;
    setIsLoading(true);

    try {
      // Get current date range for this month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Base query for user's leaves
      let userLeavesQuery = supabase
        .from('project_leave_requests')
        .select('*', { count: 'exact' })
        .eq('consultant_id', user.id)
        .gte('start_date', firstDay)
        .lte('start_date', lastDay);

      // If company_id exists in the table, filter by it
      const { data: tableInfo } = await supabase
        .from('project_leave_requests')
        .select('*')
        .limit(1);
      
      if (tableInfo && tableInfo[0]?.company_id) {
        userLeavesQuery = userLeavesQuery.eq('company_id', currentCompany.id);
      }

      // Execute the query
      const { data: userLeaves = [], error: userLeavesError, count: totalLeaves } = await userLeavesQuery;
      if (userLeavesError) throw userLeavesError;

      // Calculate metrics
      const totalThisMonth = totalLeaves || 0;
      const pendingCount = userLeaves.filter(leave => leave.status === 'pending').length;
      const approvedCount = userLeaves.filter(leave => leave.status === 'approved').length;

      // Fetch pending project leave requests for the team (for managers/admins)
      let teamPendingCount = 0;
      
      if (['admin', 'super_admin', 'reporting_manager'].includes(user.role)) {
        let query = supabase
          .from('project_leave_requests')
          .select('*', { count: 'exact' })
          .eq('status', 'pending');
        
        // Add company_id filter if the column exists
        if (tableInfo && tableInfo[0]?.company_id) {
          query = query.eq('company_id', currentCompany.id);
        }

        // For reporting managers, only show their team's requests
        if (user.role === 'reporting_manager') {
          const { data: teamMembers } = await supabase
            .from('employees')
            .select('id')
            .eq('reporting_manager_id', user.id);
          
          const teamIds = teamMembers?.map(member => member.id) || [];
          if (teamIds.length > 0) {
            query = query.in('consultant_id', teamIds);
          } else {
            query = query.eq('consultant_id', user.id); // Fallback to own requests if no team members
          }
        }

        const { count } = await query;
        teamPendingCount = count || 0;
      }

      // Update metrics state
      setLeaveMetrics({
        totalThisMonth,
        pendingCount,
        approvedCount,
        teamPendingCount
      });

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
          teamIds.includes(request.consultant_id)
        ) || [];
        setPendingProjectLeaveRequests(filteredRequests);
      } else {
        // Regular employees see their own pending requests
        const employeeRequests = pendingRequests?.filter(
          request => request.consultant_id === user.id
        ) || [];
        setPendingProjectLeaveRequests(employeeRequests);
      }

      // Calculate leave balance (10 days per year minus used days)
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1).toISOString();
      const yearEnd = new Date(currentYear, 11, 31).toISOString();

      const { data: approvedLeaves, error: approvedError } = await supabase
        .from('project_leave_requests')
        .select('total_days')
        .eq('consultant_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', yearStart)
        .lte('end_date', yearEnd);

      if (approvedError) console.error('Error fetching approved leaves:', approvedError);
      
      const usedDays = approvedLeaves?.reduce((sum, leave) => sum + (leave.total_days || 0), 0) || 0;
      const annualLeaveAllowance = 10; // Default 10 days per year
      const remainingBalance = Math.max(0, annualLeaveAllowance - usedDays);
      
      setProjectLeaveBalances(remainingBalance);

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
    leaveMetrics,
    isLoading,
    refresh: fetchProjectLeaveData
  };
};