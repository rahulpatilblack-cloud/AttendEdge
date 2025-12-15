import React, { useEffect, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

/**
 * Safely parse YYYY-MM-DD dates without timezone shifts
 */
const parseLocalDate = (dateStr?: string) => {
  if (!dateStr) return null;

  const clean = dateStr.split('T')[0]; // handle timestamps defensively
  const [year, month, day] = clean.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const ProjectLeaveManagement: React.FC = () => {
  const { updateLeaveRequest } = useProjects();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const canManage =
    user &&
    (user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'reporting_manager');

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: leaveData, error: leaveError } = await supabase
        .from('project_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      const leaves = leaveData || [];

      const consultantIds = [...new Set(leaves.map(l => l.consultant_id))];
      const projectIds = [...new Set(leaves.map(l => l.project_id))];
      const leaveTypeIds = [...new Set(leaves.map(l => l.leave_type_id))];

      let consultantMap: Record<string, any> = {};
      let projectMap: Record<string, any> = {};
      let leaveTypeMap: Record<string, any> = {};

      if (consultantIds.length) {
        const { data } = await supabase
          .from('employees')
          .select('id, name, email')
          .in('id', consultantIds);

        consultantMap = Object.fromEntries((data || []).map(e => [e.id, e]));
      }

      if (projectIds.length) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        projectMap = Object.fromEntries((data || []).map(p => [p.id, p]));
      }

      if (leaveTypeIds.length) {
        const { data } = await supabase
          .from('leave_types')
          .select('id, name')
          .in('id', leaveTypeIds);

        leaveTypeMap = Object.fromEntries((data || []).map(lt => [lt.id, lt]));
      }

      setItems(
        leaves.map(l => ({
          ...l,
          employee: consultantMap[l.consultant_id] || null,
          project: projectMap[l.project_id] || null,
          leave_type: leaveTypeMap[l.leave_type_id] || null,
        }))
      );
    } catch (err) {
      console.error(err);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStatusChange = async (
    id: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    if (!canManage) return;

    setActionLoadingId(id);

    let rejectionReason: string | null = null;

    if (newStatus === 'rejected') {
      rejectionReason = prompt('Enter rejection reason:');

      if (!rejectionReason || rejectionReason.trim().length < 3) {
        toast({
          title: 'Reason Required',
          description: 'A valid rejection reason is required.',
          variant: 'destructive',
        });

        setActionLoadingId(null);
        return;
      }
    }

    try {
      await updateLeaveRequest(id, {
        status: newStatus,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });

      toast({
        title: 'Success',
        description: `Leave request has been ${newStatus}.`,
      });

      await loadAll();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to update leave request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusBadgeVariant = (status: string) =>
    ({
      approved: 'default',
      rejected: 'destructive',
      pending: 'secondary',
    }[status] || 'outline');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Manage Project Leave</h1>

      {error && (
        <Card>
          <CardContent className="p-4 text-red-600">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Project Leave Requests
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records found.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {items.map(lr => {
                const start = parseLocalDate(lr.start_date);
                const end = parseLocalDate(lr.end_date);

                return (
                  <div key={lr.id} className="border p-3 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">
                          {lr.employee?.name || lr.employee?.email}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {lr.project?.name} • {lr.leave_type?.name}
                        </p>

                        <p className="text-xs">
                          {start ? format(start, 'PPP') : '-'} →{' '}
                          {end ? format(end, 'PPP') : '-'} ({lr.total_days} days)
                        </p>

                        {lr.reason && (
                          <p className="text-xs text-muted-foreground">
                            {lr.reason}
                          </p>
                        )}
                      </div>

                      <Badge variant={statusBadgeVariant(lr.status)}>
                        {lr.status}
                      </Badge>
                    </div>

                    {canManage && lr.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          disabled={actionLoadingId === lr.id}
                          onClick={() =>
                            handleStatusChange(lr.id, 'approved')
                          }
                        >
                          {actionLoadingId === lr.id
                            ? 'Processing...'
                            : 'Approve'}
                        </Button>

                        <Button
                          size="xs"
                          variant="destructive"
                          disabled={actionLoadingId === lr.id}
                          onClick={() =>
                            handleStatusChange(lr.id, 'rejected')
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectLeaveManagement;
