import React, { useEffect, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ProjectLeaveManagement: React.FC = () => {
  const { updateLeaveRequest } = useProjects();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const canManage =
    user && ['reporting_manager', 'admin', 'super_admin'].includes(user.role);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Get all project leave requests (no joins here)
      const { data: leaveData, error: leaveError } = await supabase
        .from('project_leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      const leaves = leaveData || [];

      // 2) Collect unique foreign IDs
      const consultantIds = Array.from(
        new Set(
          leaves
            .map((lr: any) => lr.consultant_id)
            .filter((id: string | null | undefined) => !!id)
        )
      );
      const projectIds = Array.from(
        new Set(
          leaves
            .map((lr: any) => lr.project_id)
            .filter((id: string | null | undefined) => !!id)
        )
      );
      const leaveTypeIds = Array.from(
        new Set(
          leaves
            .map((lr: any) => lr.leave_type_id)
            .filter((id: string | null | undefined) => !!id)
        )
      );

      // 3) Fetch consultants (employees)
      let consultantMap: Record<string, any> = {};
      if (consultantIds.length > 0) {
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('id, name, email')
          .in('id', consultantIds);

        if (empError) throw empError;

        consultantMap = Object.fromEntries(
          (employees || []).map((e: any) => [e.id, e])
        );
      }

      // 4) Fetch projects
      let projectMap: Record<string, any> = {};
      if (projectIds.length > 0) {
        const { data: projects, error: projError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);

        if (projError) throw projError;

        projectMap = Object.fromEntries(
          (projects || []).map((p: any) => [p.id, p])
        );
      }

      // 5) Fetch leave types
      let leaveTypeMap: Record<string, any> = {};
      if (leaveTypeIds.length > 0) {
        const { data: leaveTypes, error: ltError } = await supabase
          .from('leave_types')
          .select('id, name')
          .in('id', leaveTypeIds);

        if (ltError) throw ltError;

        leaveTypeMap = Object.fromEntries(
          (leaveTypes || []).map((lt: any) => [lt.id, lt])
        );
      }

      // 6) Attach consultant, project, and leave_type objects
      const enriched = leaves.map((lr: any) => ({
        ...lr,
        employee: lr.consultant_id ? consultantMap[lr.consultant_id] : null,
        project: lr.project_id ? projectMap[lr.project_id] : null,
        leave_type: lr.leave_type_id ? leaveTypeMap[lr.leave_type_id] : null,
      }));

      setItems(enriched);
    } catch (err) {
      console.error('Error fetching project leave requests:', err);
      setError('Failed to load project leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStatusChange = async (
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!canManage) return;
    setActionLoadingId(id);
    try {
      await updateLeaveRequest(id, { status });
      await loadAll();
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Project Leave</h1>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Project Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-sm text-muted-foreground">
              Loading leave requests...
            </div>
          ) : items.length === 0 ? (
            <div className="py-4 text-sm text-muted-foreground">
              No project leave requests found.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {items.map((lr) => (
                <div key={lr.id} className="p-3 border rounded-md space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">
                        {lr.employee?.name || lr.employee?.email || 'Unknown consultant'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lr.project?.name || 'Unknown Project'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lr.leave_type?.name} •{' '}
                        {new Date(lr.start_date).toLocaleDateString()} -{' '}
                        {new Date(lr.end_date).toLocaleDateString()} (
                        {lr.total_days} days)
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
                        {actionLoadingId === lr.id
                          ? 'Approving...'
                          : 'Approve'}
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={actionLoadingId === lr.id}
                        onClick={() => handleStatusChange(lr.id, 'rejected')}
                      >
                        {actionLoadingId === lr.id
                          ? 'Rejecting...'
                          : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectLeaveManagement;