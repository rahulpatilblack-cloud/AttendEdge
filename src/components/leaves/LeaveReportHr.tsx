import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  parseISO,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, FileSpreadsheet, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface HrLeaveRow {
  id: string;
  consultant_id: string;
  consultant_name: string;
  consultant_email: string;
  project_id: string;
  project_name: string;
  client_name: string;
  date: string;
  hours: number;
  type: 'full_day' | 'half_day' | 'partial';
  status: 'approved' | 'pending' | 'rejected';
  notes?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const months = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

const statusVariant = (status: string) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
};

const parseDate = (d: string) => parseISO(d);

const LeaveReportHr: React.FC = () => {
  const { currentCompany } = useCompany();
  const prevMonth = subMonths(new Date(), 1);

  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'yearly'>('monthly');
  const [year, setYear] = useState(prevMonth.getFullYear().toString());
  const [month, setMonth] = useState(prevMonth.getMonth().toString());
  const [quarter, setQuarter] = useState<'1' | '2' | '3' | '4'>('1');
  const [half, setHalf] = useState<'1' | '2'>('1');

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [employeeId, setEmployeeId] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const { dateFrom, dateTo } = useMemo(() => {
    const y = Number(year);

    if (periodType === 'monthly') {
      const m = Number(month);
      return {
        dateFrom: startOfMonth(new Date(y, m, 1)),
        dateTo: endOfMonth(new Date(y, m, 1)),
      };
    }

    if (periodType === 'quarterly') {
      const qMonth = (Number(quarter) - 1) * 3;
      const base = new Date(y, qMonth, 1);
      return { dateFrom: startOfQuarter(base), dateTo: endOfQuarter(base) };
    }

    if (periodType === 'half-yearly') {
      const m = half === '1' ? 0 : 6;
      const base = new Date(y, m, 1);
      return {
        dateFrom: m === 0 ? startOfYear(base) : startOfMonth(base),
        dateTo: m === 0 ? endOfMonth(new Date(y, 5, 1)) : endOfYear(base),
      };
    }

    return { dateFrom: startOfYear(new Date(y, 0, 1)), dateTo: endOfYear(new Date(y, 0, 1)) };
  }, [periodType, year, month, quarter, half]);

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
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

  const { data: rows = [], isLoading } = useQuery<HrLeaveRow[]>({
    queryKey: [
      'leave-report-hr',
      periodType,
      year,
      month,
      quarter,
      half,
      statusFilter,
      employeeId,
      clientSearch,
    ],
    queryFn: async () => {
      let query = supabase
        .from('project_leaves')
        .select(
          `
            id,
            consultant_id,
            project_id,
            date,
            hours,
            type,
            status,
            notes,
            employees:consultant_id(id, name, email),
            projects:project_id(id, name, client_name)
          `
        )
        .gte('date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('date', format(dateTo, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (employeeId !== 'all') query = query.eq('consultant_id', employeeId);

      const { data, error } = await query;
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load leave report (hr)',
          variant: 'destructive',
        });
        throw error;
      }

      return (data || [])
        .map((l: any) => {
          return {
            id: l.id,
            consultant_id: l.consultant_id,
            consultant_name: l.employees?.name ?? 'Unknown',
            consultant_email: l.employees?.email ?? '',
            project_id: l.project_id,
            project_name: l.projects?.name ?? 'Unknown Project',
            client_name: l.projects?.client_name ?? '-',
            date: l.date,
            hours: Number(l.hours) || 0,
            type: l.type,
            status: l.status,
            notes: l.notes ?? '',
          } as HrLeaveRow;
        })
        .filter(r => {
          const clientOk = r.client_name.toLowerCase().includes(clientSearch.toLowerCase());
          return clientOk;
        });
    },
    enabled: !!currentCompany?.id,
  });

  const selectedEmployee = useMemo(() => {
    if (employeeId === 'all') return null;
    return employees.find(e => e.id === employeeId) || null;
  }, [employeeId, employees]);

  const summary = useMemo(() => {
    const totalHours = rows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
    const employeesCount = new Set(rows.map(r => r.consultant_id)).size;
    return { totalHours, employeesCount };
  }, [rows]);

  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map(r => ({
        Consultant: r.consultant_name,
        Email: r.consultant_email,
        Client: r.client_name,
        Project: r.project_name,
        Date: r.date,
        Hours: r.hours,
        Type: r.type,
        Status: r.status,
        Notes: r.notes,
      }))
    );

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Leave Report (hr)');
    XLSX.writeFile(book, `leave_report_hr_${periodType}_${year}.xlsx`);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setEmployeeId('all');
    setClientSearch('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Leave Report (hr)</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} records • {summary.employeesCount} consultants • {summary.totalHours} hours
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
        <div className="md:col-span-2">
          <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={employeeOpen} className="w-full justify-between">
                {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.email})` : 'All Consultants'}
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
                        setEmployeeId('all');
                        setEmployeeOpen(false);
                      }}
                    >
                      <Check className={employeeId === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                      All Consultants
                    </CommandItem>
                    {employees.map(e => (
                      <CommandItem
                        key={e.id}
                        value={`${e.name} ${e.email}`}
                        onSelect={() => {
                          setEmployeeId(e.id);
                          setEmployeeOpen(false);
                        }}
                      >
                        <Check className={employeeId === e.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                        {e.name} ({e.email})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Select value={periodType} onValueChange={v => setPeriodType(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="half-yearly">Half Yearly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {periodType === 'monthly' && (
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {periodType === 'quarterly' && (
          <Select value={quarter} onValueChange={v => setQuarter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        )}

        {periodType === 'half-yearly' && (
          <Select value={half} onValueChange={v => setHalf(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Half" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Input placeholder="Search client" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Consultant</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Hours</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No records found
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.consultant_name}</div>
                    <div className="text-xs text-muted-foreground">{r.consultant_email}</div>
                  </td>
                  <td className="px-4 py-3">{r.client_name}</td>
                  <td className="px-4 py-3">{r.project_name}</td>
                  <td className="px-4 py-3">{format(parseDate(r.date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.hours}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveReportHr;
