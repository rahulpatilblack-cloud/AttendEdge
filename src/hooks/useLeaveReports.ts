import { useQuery } from '@tanstack/react-query';
import { fetchLeaveReports } from '@/api/leaveReports';
import { LeaveFilters } from '@/types/leave';

export const useLeaveReports = (filters: LeaveFilters) => {
  return useQuery({
    queryKey: ['leave-reports', filters],
    queryFn: () => fetchLeaveReports(filters),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};