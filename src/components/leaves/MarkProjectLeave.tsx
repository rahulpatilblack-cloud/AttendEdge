import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, ChevronsUpDown } from 'lucide-react';

type LeaveType = 'full_day' | 'half_day' | 'partial';

type AssignmentOption = {
  consultant_project_id: string;
  project_id: string;
  project_name: string;
  consultant_id: string;
  consultant_name: string;
  allocated_hours: number;
  allocated_leave_hours: number;
};

type ConsultantOption = {
  consultant_id: string;
  consultant_name: string;
};

type RecentLeaveRow = {
  id: string;
  date: string;
  hours: number;
  type: string;
  notes: string | null;
  project_id: string;
  consultant_id: string;
  created_at: string;
};

export default function MarkProjectLeave() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [consultantOpen, setConsultantOpen] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<LeaveType>('full_day');
  const [partialHours, setPartialHours] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const [recentLeaves, setRecentLeaves] = useState<RecentLeaveRow[]>([]);

  const consultants = useMemo((): ConsultantOption[] => {
    const map = new Map<string, ConsultantOption>();
    for (const a of assignments) {
      if (!map.has(a.consultant_id)) {
        map.set(a.consultant_id, {
          consultant_id: a.consultant_id,
          consultant_name: a.consultant_name,
        });
      }
    }
    return Array.from(map.values()).sort((x, y) => x.consultant_name.localeCompare(y.consultant_name));
  }, [assignments]);

  const selectedConsultant = useMemo(() => {
    return consultants.find(c => c.consultant_id === selectedConsultantId) || null;
  }, [consultants, selectedConsultantId]);

  const filteredProjects = useMemo(() => {
    if (!selectedConsultantId) return [] as Array<{ project_id: string; project_name: string }>;
    const map = new Map<string, { project_id: string; project_name: string }>();
    for (const a of assignments) {
      if (a.consultant_id !== selectedConsultantId) continue;
      if (!map.has(a.project_id)) {
        map.set(a.project_id, { project_id: a.project_id, project_name: a.project_name });
      }
    }
    return Array.from(map.values()).sort((x, y) => x.project_name.localeCompare(y.project_name));
  }, [assignments, selectedConsultantId]);

  const selectedAssignment = useMemo(() => {
    if (!selectedConsultantId || !selectedProjectId) return null;
    return (
      assignments.find(a => a.consultant_id === selectedConsultantId && a.project_id === selectedProjectId) || null
    );
  }, [assignments, selectedConsultantId, selectedProjectId]);

  const computedHours = useMemo(() => {
    if (leaveType === 'full_day') return 8;
    if (leaveType === 'half_day') return 4;
    return Number(partialHours) || 0;
  }, [leaveType, partialHours]);

  const fetchAssignments = async () => {
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

      const formatted: AssignmentOption[] = (data || []).map((item: any) => ({
        consultant_project_id: item.id,
        project_id: item.project_id,
        project_name: item.projects?.name || 'Unknown Project',
        consultant_id: item.consultant_id,
        consultant_name: item.employees?.name || 'Unknown Consultant',
        allocated_hours: Number(item.allocated_hours) || 0,
        allocated_leave_hours: Number(item.allocated_leave_hours) || 0,
      }));

      setAssignments(formatted);
      if (!selectedConsultantId && formatted.length > 0) {
        const firstConsultantId = formatted[0].consultant_id;
        setSelectedConsultantId(firstConsultantId);
        const firstProjectId = formatted.find(a => a.consultant_id === firstConsultantId)?.project_id || '';
        setSelectedProjectId(firstProjectId);
      }
    } catch (e: any) {
      console.error('Error fetching assignments:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to load consultant projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentLeaves = async () => {
    try {
      const { data, error } = await supabase
        .from('project_leaves')
        .select('id,date,hours,type,notes,project_id,consultant_id,created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setRecentLeaves((data || []) as RecentLeaveRow[]);
    } catch (e: any) {
      console.error('Error fetching recent leaves:', e);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchRecentLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateLeave = async () => {
    if (!selectedAssignment) {
      toast({
        title: 'Error',
        description: 'Please select a project + consultant assignment',
        variant: 'destructive',
      });
      return;
    }

    if (!leaveDate) {
      toast({
        title: 'Error',
        description: 'Please select a leave date',
        variant: 'destructive',
      });
      return;
    }

    if (!notes.trim()) {
      toast({
        title: 'Error',
        description: 'Notes/remarks are required',
        variant: 'destructive',
      });
      return;
    }

    if (computedHours <= 0) {
      toast({
        title: 'Error',
        description: 'Leave hours must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        consultant_id: selectedAssignment.consultant_id,
        project_id: selectedAssignment.project_id,
        date: leaveDate,
        hours: computedHours,
        type: leaveType,
        status: 'approved',
        notes: notes.trim(),
        created_by: user?.id,
      };

      const { error } = await supabase.from('project_leaves').insert([payload]);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave marked successfully',
      });

      setNotes('');
      setLeaveType('full_day');
      setPartialHours(1);

      await fetchRecentLeaves();
      await fetchAssignments();
    } catch (e: any) {
      console.error('Error creating leave:', e);
      toast({
        title: 'Error',
        description: e?.message || 'Failed to mark leave',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  const remaining = selectedAssignment
    ? (Number(selectedAssignment.allocated_hours) || 0) - (Number(selectedAssignment.allocated_leave_hours) || 0)
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mark Project Leave (Hours)</h1>
        <Button variant="outline" onClick={() => { fetchAssignments(); fetchRecentLeaves(); }}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Consultant</div>
              <Popover open={consultantOpen} onOpenChange={setConsultantOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={consultantOpen}
                    className="w-full justify-between"
                  >
                    {selectedConsultant ? selectedConsultant.consultant_name : 'Select consultant'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search consultant..." />
                    <CommandList>
                      <CommandEmpty>No consultant found.</CommandEmpty>
                      <CommandGroup>
                        {consultants.map(c => (
                          <CommandItem
                            key={c.consultant_id}
                            value={c.consultant_name}
                            onSelect={() => {
                              setSelectedConsultantId(c.consultant_id);
                              const firstProjectId =
                                assignments.find(a => a.consultant_id === c.consultant_id)?.project_id || '';
                              setSelectedProjectId(firstProjectId);
                              setConsultantOpen(false);
                            }}
                          >
                            <Check
                              className={
                                selectedConsultantId === c.consultant_id
                                  ? 'mr-2 h-4 w-4 opacity-100'
                                  : 'mr-2 h-4 w-4 opacity-0'
                              }
                            />
                            {c.consultant_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAssignment && (
                <div className="text-xs text-muted-foreground">
                  Allocated: {selectedAssignment.allocated_hours} hrs | Used: {selectedAssignment.allocated_leave_hours} hrs | Remaining: {remaining} hrs
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Project</div>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!selectedConsultantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedConsultantId ? 'Select project' : 'Select consultant first'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map(p => (
                    <SelectItem key={p.project_id} value={p.project_id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Date</div>
              <Input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Leave Type</div>
              <Select value={leaveType} onValueChange={v => setLeaveType(v as LeaveType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day (8 hrs)</SelectItem>
                  <SelectItem value="half_day">Half Day (4 hrs)</SelectItem>
                  <SelectItem value="partial">Partial (custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Hours</div>
              <Input
                type="number"
                min="0.25"
                step="0.25"
                value={leaveType === 'partial' ? partialHours : computedHours}
                onChange={e => setPartialHours(Number(e.target.value))}
                disabled={leaveType !== 'partial'}
              />
              <div className="text-xs text-muted-foreground">Computed: {computedHours} hrs</div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="text-sm font-medium">Notes / Remarks (required)</div>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreateLeave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Mark Leave'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Leaves</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLeaves.length > 0 ? (
                recentLeaves.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{l.date}</TableCell>
                    <TableCell className="text-right">{l.hours}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell className="max-w-[420px] truncate" title={l.notes || ''}>
                      {l.notes || ''}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No leaves found
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
