import React, { useEffect, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectLeaveListProps {
  projectId: string;
}

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

  const canManage = user && ['reporting_manager', 'admin', 'super_admin'].includes(user.role);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
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
    return <div className="py-4 text-sm text-muted-foreground">Loading leave requests...</div>;
  }

  if (!loading && items.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground">No leave requests for this project yet.</div>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {items.map((lr) => (
        <div key={lr.id} className="p-3 border rounded-md space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">
                {lr.employee?.first_name} {lr.employee?.last_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {lr.leave_type?.name} • {new Date(lr.start_date).toLocaleDateString()} - {new Date(lr.end_date).toLocaleDateString()} ({lr.total_days} days)
              </div>
              {lr.reason && (
                <div className="text-xs text-muted-foreground mt-1">{lr.reason}</div>
              )}
            </div>
            <Badge variant={lr.status === 'approved' ? 'default' : lr.status === 'rejected' ? 'destructive' : 'secondary'}>
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
      ))}
    </div>
  );
};

export default ProjectLeaveList;
