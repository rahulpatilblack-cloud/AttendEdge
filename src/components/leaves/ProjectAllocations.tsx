import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

type AllocationRow = {
  consultant_project_id: string;
  project_id: string;
  project_name: string;
  consultant_id: string;
  consultant_name: string;
  allocated_hours: number;
  allocated_leave_hours: number;
};

export default function ProjectAllocations() {
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const { toast } = useToast();

  const totals = useMemo(() => {
    const allocated = rows.reduce((sum, r) => sum + (Number(r.allocated_hours) || 0), 0);
    const used = rows.reduce((sum, r) => sum + (Number(r.allocated_leave_hours) || 0), 0);
    return {
      allocated,
      used,
      remaining: allocated - used,
    };
  }, [rows]);

  const fetchRows = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('consultant_projects')
        .select(
          `
            id,
            project_id,
            projects:project_id(name),
            consultant_id,
            employees:consultant_id(name),
            allocated_hours,
            allocated_leave_hours
          `
        )
        .order('projects(name)', { ascending: true });

      if (error) throw error;

      const formatted: AllocationRow[] = (data || []).map((item: any) => ({
        consultant_project_id: item.id,
        project_id: item.project_id,
        project_name: item.projects?.name || 'Unknown Project',
        consultant_id: item.consultant_id,
        consultant_name: item.employees?.name || 'Unknown Consultant',
        allocated_hours: Number(item.allocated_hours) || 0,
        allocated_leave_hours: Number(item.allocated_leave_hours) || 0,
      }));

      setRows(formatted);
    } catch (e: any) {
      console.error('Error fetching project allocations:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to fetch project allocations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAllocatedHoursLocal = (index: number, value: string) => {
    const next = [...rows];
    next[index] = {
      ...next[index],
      allocated_hours: Number(value) || 0,
    };
    setRows(next);
  };

  const saveRow = async (row: AllocationRow) => {
    try {
      setSavingRowId(row.consultant_project_id);

      const { error } = await supabase
        .from('consultant_projects')
        .update({ allocated_hours: row.allocated_hours })
        .eq('id', row.consultant_project_id);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project leave budget saved successfully',
      });

      await fetchRows();
    } catch (e: any) {
      console.error('Error saving project allocations:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to save project leave budget',
        variant: 'destructive',
      });
    } finally {
      setSavingRowId(null);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Project Leave Budgets (Yearly)</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={fetchRows} disabled={isLoading || savingRowId !== null}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead className="text-right">Allocated (hrs)</TableHead>
                  <TableHead className="text-right">Used (hrs)</TableHead>
                  <TableHead className="text-right">Remaining (hrs)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((r, idx) => {
                    const remaining = (Number(r.allocated_hours) || 0) - (Number(r.allocated_leave_hours) || 0);
                    const isRowSaving = savingRowId === r.consultant_project_id;
                    return (
                      <TableRow key={r.consultant_project_id}>
                        <TableCell className="font-medium">{r.project_name}</TableCell>
                        <TableCell>{r.consultant_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={r.allocated_hours}
                              onChange={e => updateAllocatedHoursLocal(idx, e.target.value)}
                              className="w-28 text-right"
                              disabled={isRowSaving}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{Number(r.allocated_leave_hours) || 0}</TableCell>
                        <TableCell className="text-right">{remaining}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => saveRow(r)}
                            disabled={isRowSaving}
                            size="sm"
                          >
                            {isRowSaving ? 'Saving...' : 'Save'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No consultant projects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end text-sm text-muted-foreground">
            <div className="text-right">
              <div>Total Allocated: {totals.allocated}</div>
              <div>Total Used: {totals.used}</div>
              <div>Total Remaining: {totals.remaining}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
