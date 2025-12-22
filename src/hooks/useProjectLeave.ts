// src/hooks/useProjectLeave.ts
// 
// This hook manages PROJECT LEAVE requests and balances
// - Uses leave_types table for allocations (same as regular leave)
// - Stores requests in project_leave_requests table (different from regular leave_requests)
// - Calculates balances by subtracting approved project leave days from leave type allocations
//
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface ProjectLeaveRequest {
  id: string;
  project_id: string;
  employee_id: string;
  consultant_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  company_id?: string;
  leave_types: {
    name: string;
  };
  projects: {
    name: string;
  };
}

interface LeaveType {
  id: string;
  name: string;
  max_days_per_year: number;
  company_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface LeaveBalance {
  leave_type_id: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_name: string;
}

interface ProjectLeaveMetrics {
  totalThisMonth: number;
  pendingCount: number;
  approvedCount: number;
  teamPendingCount: number;
  totalAllocatedDays: number;
  totalUsedDays: number;
  totalRemainingDays: number;
}

export const useProjectLeave = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [pendingProjectLeaveRequests, setPendingProjectLeaveRequests] = useState<ProjectLeaveRequest[]>([]);
  const [projectLeaveBalances, setProjectLeaveBalances] = useState<number>(0);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [leaveMetrics, setLeaveMetrics] = useState<ProjectLeaveMetrics>({
    totalThisMonth: 0,
    pendingCount: 0,
    approvedCount: 0,
    teamPendingCount: 0,
    totalAllocatedDays: 0,
    totalUsedDays: 0,
    totalRemainingDays: 0
  });

  // Fetch leave types from database (same source as regular leave)
  const fetchLeaveTypes = async () => {
    if (!currentCompany) {
      console.warn('No current company, cannot fetch leave types');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching leave types:', error);
        throw error;
      }
      
      console.log('Fetched leave types for project leave:', data);
      setLeaveTypes(data || []);
      return data || [];
    } catch (error) {
      console.error('Error in fetchLeaveTypes:', error);
      return [];
    }
  };

  const calculateLeaveBalances = async () => {
    if (!user || !currentCompany) {
      console.warn('No user or company, cannot calculate balances');
      return [];
    }

    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      console.log('Calculating project leave balances for:', {
        user: user.id,
        company: currentCompany.id,
        year: currentYear
      });

      // 1. Fetch all active leave types for the company
      const leaveTypes = await fetchLeaveTypes();
      if (!leaveTypes || leaveTypes.length === 0) {
        console.warn('No active leave types found for the company');
        setProjectLeaveBalances(0);
        setLeaveBalances([]);
        setLeaveMetrics(prev => ({
          ...prev,
          totalAllocatedDays: 0,
          totalUsedDays: 0,
          totalRemainingDays: 0
        }));
        return [];
      }

      console.log('Leave types found:', leaveTypes.map(t => ({ id: t.id, name: t.name, max_days: t.max_days_per_year })));

      // 2. Fetch all approved PROJECT leave requests for the user in the current year
      const { data: approvedProjectLeaves = [], error: leavesError } = await supabase
        .from('project_leave_requests')
        .select('leave_type_id, total_days, start_date, end_date, status')
        .eq('consultant_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', yearStart)
        .lte('end_date', yearEnd);

      if (leavesError) {
        console.error('Error fetching approved project leaves:', leavesError);
        throw leavesError;
      }

      console.log('Approved project leaves found:', approvedProjectLeaves.length, approvedProjectLeaves);

      // 3. Calculate used days by leave type from PROJECT leave requests
      const usedDaysByType = new Map<string, number>();
      approvedProjectLeaves.forEach(leave => {
        if (leave.leave_type_id) {
          const current = usedDaysByType.get(leave.leave_type_id) || 0;
          usedDaysByType.set(leave.leave_type_id, current + (leave.total_days || 0));
        }
      });

      console.log('Used days by type:', Array.from(usedDaysByType.entries()));

      // 4. Calculate balances for each leave type
      const balances: LeaveBalance[] = leaveTypes.map(type => {
        const usedDays = usedDaysByType.get(type.id) || 0;
        const remaining = Math.max(0, type.max_days_per_year - usedDays);
        
        return {
          leave_type_id: type.id,
          allocated_days: type.max_days_per_year,
          used_days: usedDays,
          remaining_days: remaining,
          leave_type_name: type.name
        };
      });

      console.log('Calculated balances:', balances.map(b => ({
        type: b.leave_type_name,
        allocated: b.allocated_days,
        used: b.used_days,
        remaining: b.remaining_days
      })));

      // 5. Calculate totals across all leave types
      const totalAllocated = leaveTypes.reduce((sum, type) => sum + (type.max_days_per_year || 0), 0);
      const totalUsed = balances.reduce((sum, balance) => sum + balance.used_days, 0);
      const totalRemaining = Math.max(0, totalAllocated - totalUsed);

      console.log('Project Leave Totals:', {
        totalAllocated,
        totalUsed,
        totalRemaining
      });

      // 6. Update state
      setProjectLeaveBalances(totalRemaining);
      setLeaveBalances(balances);
      setLeaveMetrics(prev => ({
        ...prev,
        totalAllocatedDays: totalAllocated,
        totalUsedDays: totalUsed,
        totalRemainingDays: totalRemaining
      }));

      return balances;
    } catch (error) {
      console.error('Error calculating project leave balances:', error);
      setProjectLeaveBalances(0);
      setLeaveBalances([]);
      return [];
    }
  };

  const fetchProjectLeaveData = async () => {
    if (!user || !currentCompany) return;
    setIsLoading(true);

    try {
      // Get current date range for this month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Check if company_id column exists in the table
      const { data: tableInfo } = await supabase
        .from('project_leave_requests')
        .select('*')
        .limit(1);
      
      const hasCompanyId = tableInfo && tableInfo.length > 0 && 'company_id' in tableInfo[0];

      // Base query for user's leaves this month
      let userLeavesQuery = supabase
        .from('project_leave_requests')
        .select('*', { count: 'exact' })
        .eq('consultant_id', user.id)
        .gte('start_date', firstDay)
        .lte('start_date', lastDay);

      if (hasCompanyId) {
        userLeavesQuery = userLeavesQuery.eq('company_id', currentCompany.id);
      }

      // Execute the query
      const { data: userLeaves = [], error: userLeavesError, count: totalLeaves } = await userLeavesQuery;
      if (userLeavesError) throw userLeavesError;

      // Calculate metrics for this month
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
        
        if (hasCompanyId) {
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
            query = query.eq('consultant_id', user.id);
          }
        }

        const { count } = await query;
        teamPendingCount = count || 0;
      }

      // Fetch pending project leave requests with details
      let pendingQuery = supabase
        .from('project_leave_requests')
        .select(`
          *,
          leave_types:leave_type_id (name),
          projects:project_id (name)
        `)
        .eq('status', 'pending');

      if (hasCompanyId) {
        pendingQuery = pendingQuery.eq('company_id', currentCompany.id);
      }

      const { data: pendingRequests, error: pendingError } = await pendingQuery;
      if (pendingError) throw pendingError;

      // Filter requests based on user role
      if (['admin', 'super_admin'].includes(user.role)) {
        setPendingProjectLeaveRequests(pendingRequests || []);
      } else if (user.role === 'reporting_manager') {
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
        const employeeRequests = pendingRequests?.filter(
          request => request.consultant_id === user.id
        ) || [];
        setPendingProjectLeaveRequests(employeeRequests);
      }

      // Calculate leave balances by type
      await calculateLeaveBalances();

      // Update metrics state with this month's data
      setLeaveMetrics(prev => ({
        ...prev,
        totalThisMonth,
        pendingCount,
        approvedCount,
        teamPendingCount
      }));

    } catch (error) {
      console.error('Error fetching project leave data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentCompany) {
      fetchProjectLeaveData();
    }
  }, [user?.id, currentCompany?.id]);

  return {
    pendingProjectLeaveRequests,
    projectLeaveBalances,
    leaveMetrics,
    leaveBalances,
    leaveTypes,
    isLoading,
    refresh: fetchProjectLeaveData,
    refreshBalances: calculateLeaveBalances
  };
};