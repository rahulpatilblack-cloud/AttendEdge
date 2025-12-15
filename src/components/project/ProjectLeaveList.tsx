import React, { useEffect, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ProjectLeaveListProps {
  projectId: string;
}

/**
 * Safely parse YYYY-MM-DD without timezone shifts
 */
const parseLocalDate = (dateStr?: string) => {
  if (!dateStr) return null;

  const clean = dateStr.split('T')[0];
  const [year, month, day] = clean.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const ProjectLeaveList: React.FC<ProjectLeaveListProps> = ({ projectId }) => {
  const { fetchLeaveRequests, updateLeaveRequest } = useProjects();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchLeaveRequests(projectId);
        setItems(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, fetchLeaveRequests]);

  const canManage =
    user &&
    (user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'reporting_manager');

  const handleStatusChange = async (
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!canManage) return;

    setActionLoadingId(id);
    try {
      await updateLeaveRequest(id, { status });
      const data = await fetchLeaveRequests(projectId);
      setItems(data || []);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading leave requests...
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        No leave requests for this project yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {items.map(lr => {
        const start = parseLocalDate(lr.start_date);
        const end = parseLocalDate(lr.end_date);

        return (
          <div key={lr.id} className="p-3 border rounded-md space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">
                  {lr.employee?.name || 'Unknown'}
                </div>

                <div className="text-xs text-muted-foreground">
                  {lr.leave_type?.name} •{' '}
                  {start ? format(start, 'PPP') : '-'} -{' '}
                  {end ? format(end, 'PPP') : '-'} ({lr.total_days} days)
                </div>

                {lr.reason && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {lr.reason}
                  </div>
                )}
              </div>

              <Badge
                variant={
                  lr.status === 'approved'
                    ? 'default'
                    : lr.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {lr.status}
              </Badge>
            </div>

            {canManage && lr.status === 'pending' && (
              <div className="flex justify-end gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={actionLoadingId === lr.id}
                  onClick={() => handleStatusChange(lr.id, 'approved')}
                >
                  {actionLoadingId === lr.id ? 'Approving...' : 'Approve'}
                </Button>

                <Button
                  size="xs"
                  variant="destructive"
                  disabled={actionLoadingId === lr.id}
                  onClick={() => handleStatusChange(lr.id, 'rejected')}
                >
                  {actionLoadingId === lr.id ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectLeaveList;
