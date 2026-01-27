import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type StatusRow = {
  consultant_project_id: string;
  project_id: string;
  project_name: string;
  allocated_hours: number;
  used_hours: number;
};

type LeaveHistoryRow = {
  id: string;
  date: string;
  hours: number;
  type: string;
  notes: string | null;
  project_id: string;
  project_name: string;
  created_at: string;
};

export default function MyProjectLeaveStatus() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<StatusRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<LeaveHistoryRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const totals = useMemo(() => {
    const allocated = rows.reduce((sum, r) => sum + (Number(r.allocated_hours) || 0), 0);
    const used = rows.reduce((sum, r) => sum + (Number(r.used_hours) || 0), 0);
    return { allocated, used, remaining: allocated - used };
  }, [rows]);

  const projectOptions = useMemo(() => {
    return rows
      .map(r => ({ project_id: r.project_id, project_name: r.project_name }))
      .sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [rows]);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('consultant_projects')
          .select(
            `
              id,
              project_id,
              projects:project_id(name),
              allocated_hours,
              allocated_leave_hours
            `
          )
          .eq('consultant_id', user?.id)
          .order('projects(name)', { ascending: true });

        if (error) throw error;

        const formatted: StatusRow[] = (data || []).map((item: any) => ({
          consultant_project_id: item.id,
          project_id: item.project_id,
          project_name: item.projects?.name || 'Unknown Project',
          allocated_hours: Number(item.allocated_hours) || 0,
          used_hours: Number(item.allocated_leave_hours) || 0,
        }));

        setRows(formatted);

        // If current project filter is no longer valid (e.g. assignment removed), reset to all
        if (selectedProjectId !== 'all' && !formatted.some(r => r.project_id === selectedProjectId)) {
          setSelectedProjectId('all');
        }
      } catch (e: any) {
        console.error('Error fetching leave status:', e);
        toast({
          title: 'Error',
          description: e?.message || 'Failed to load project leave status',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!user?.id) return;

        let query = supabase
          .from('project_leaves')
          .select('id,date,hours,type,notes,project_id,projects:project_id(name),created_at')
          .eq('consultant_id', user.id)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(200);

        if (selectedProjectId !== 'all') {
          query = query.eq('project_id', selectedProjectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const formatted: LeaveHistoryRow[] = (data || []).map((item: any) => ({
          id: item.id,
          date: item.date,
          hours: Number(item.hours) || 0,
          type: item.type,
          notes: item.notes,
          project_id: item.project_id,
          project_name: item.projects?.name || 'Unknown Project',
          created_at: item.created_at,
        }));

        setHistory(formatted);
      } catch (e: any) {
        console.error('Error fetching leave history:', e);
        toast({
          title: 'Error',
          description: e?.message || 'Failed to load leave history',
          variant: 'destructive',
        });
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedProjectId]);

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">My Project Leave Status (Hours)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div>Total Allocated: {totals.allocated} hrs</div>
          <div>Total Used: {totals.used} hrs</div>
          <div>Total Remaining: {totals.remaining} hrs</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project-wise</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Allocated (hrs)</TableHead>
                <TableHead className="text-right">Used (hrs)</TableHead>
                <TableHead className="text-right">Remaining (hrs)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map(r => {
                  const remaining = (Number(r.allocated_hours) || 0) - (Number(r.used_hours) || 0);
                  return (
                    <TableRow key={r.consultant_project_id}>
                      <TableCell className="font-medium">{r.project_name}</TableCell>
                      <TableCell className="text-right">{r.allocated_hours}</TableCell>
                      <TableCell className="text-right">{r.used_hours}</TableCell>
                      <TableCell className="text-right">{remaining}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No assigned projects found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Leave History</CardTitle>
            <div className="w-full max-w-xs">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projectOptions.map(p => (
                    <SelectItem key={p.project_id} value={p.project_id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length > 0 ? (
                history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{h.date}</TableCell>
                    <TableCell className="font-medium">{h.project_name}</TableCell>
                    <TableCell className="text-right">{h.hours}</TableCell>
                    <TableCell>{h.type}</TableCell>
                    <TableCell className="max-w-[420px] truncate" title={h.notes || ''}>
                      {h.notes || ''}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No leave history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
