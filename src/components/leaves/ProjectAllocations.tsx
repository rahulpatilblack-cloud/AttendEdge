import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
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
  const { currentCompany } = useCompany();

  const [consultantId, setConsultantId] = useState<string>('all');
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('company_id', currentCompany!.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });

  const selectedConsultant = useMemo(() => {
    if (consultantId === 'all') return null;
    return employees.find(e => e.id === consultantId) || null;
  }, [consultantId, employees]);

  const filteredRows = useMemo(() => {
    let result = rows.filter(r => {
      const matchesConsultant = consultantId === 'all' || r.consultant_id === consultantId;
      const matchesProject = !projectSearch.trim() || r.project_name.toLowerCase().includes(projectSearch.trim().toLowerCase());
      return matchesConsultant && matchesProject;
    });

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return result.slice(startIndex, endIndex);
  }, [rows, consultantId, projectSearch, page, pageSize]);

  const totalFilteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchesConsultant = consultantId === 'all' || r.consultant_id === consultantId;
      const matchesProject = !projectSearch.trim() || r.project_name.toLowerCase().includes(projectSearch.trim().toLowerCase());
      return matchesConsultant && matchesProject;
    });
  }, [rows, consultantId, projectSearch]);

  const totalPages = Math.ceil(totalFilteredRows.length / pageSize);

  const totals = useMemo(() => {
    const allocated = filteredRows.reduce((sum, r) => sum + (Number(r.allocated_hours) || 0), 0);
    const used = filteredRows.reduce((sum, r) => sum + (Number(r.allocated_leave_hours) || 0), 0);
    return {
      allocated,
      used,
      remaining: allocated - used,
    };
  }, [filteredRows]);

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
            allocated_hours
          `
        )
        .order('projects(name)', { ascending: true });

      if (error) throw error;

      const { data: leavesData, error: leavesError } = await supabase
        .from('project_leaves')
        .select('consultant_id, project_id, hours, status');

      if (leavesError) throw leavesError;

      const usedHoursByPair = new Map<string, number>();
      (leavesData || []).forEach((l: any) => {
        if (String(l?.status || '').toLowerCase() !== 'approved') return;
        const key = `${l.consultant_id}::${l.project_id}`;
        usedHoursByPair.set(key, (usedHoursByPair.get(key) || 0) + (Number(l.hours) || 0));
      });

      const formatted: AllocationRow[] = (data || []).map((item: any) => ({
        consultant_project_id: item.id,
        project_id: item.project_id,
        project_name: item.projects?.name || 'Unknown Project',
        consultant_id: item.consultant_id,
        consultant_name: item.employees?.name || 'Unknown Consultant',
        allocated_hours: Number(item.allocated_hours) || 0,
        allocated_leave_hours: usedHoursByPair.get(`${item.consultant_id}::${item.project_id}`) || 0,
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

  useEffect(() => {
    setPage(1);
  }, [consultantId, projectSearch]);

  const updateAllocatedHoursLocal = (index: number, value: string) => {
    const next = [...rows];
    next[index] = {
      ...next[index],
      allocated_hours: Number(value) || 0,
    };
    setRows(next);
  };

  const clearFilters = () => {
    setConsultantId('all');
    setProjectSearch('');
    setPage(1);
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
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Showing {filteredRows.length} of {totalFilteredRows.length} allocations
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Popover open={consultantOpen} onOpenChange={setConsultantOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={consultantOpen} className="w-full justify-between">
                      {selectedConsultant ? `${selectedConsultant.name} (${selectedConsultant.email})` : 'All Consultants'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search consultant..." />
                      <CommandList>
                        <CommandEmpty>No consultant found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setConsultantId('all');
                              setConsultantOpen(false);
                              setPage(1);
                            }}
                          >
                            <Check className={consultantId === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                            All Consultants
                          </CommandItem>
                          {employees.map(e => (
                            <CommandItem
                              key={e.id}
                              value={`${e.name} ${e.email}`}
                              onSelect={() => {
                                setConsultantId(e.id);
                                setConsultantOpen(false);
                                setPage(1);
                              }}
                            >
                              <Check className={consultantId === e.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                              {e.name} ({e.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Input
                placeholder="Search project"
                value={projectSearch}
                onChange={e => { setProjectSearch(e.target.value); setPage(1); }}
              />

              <Select value={pageSize.toString()} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>

              <div className="md:col-span-2 flex gap-2 items-center">
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

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
                {filteredRows.length > 0 ? (
                  filteredRows.map((r, idx) => {
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
                      {totalFilteredRows.length > 0 ? 'No allocations on this page' : 'No consultant projects found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

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
