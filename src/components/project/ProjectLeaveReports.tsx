import React, { useMemo, useState, useEffect } from 'react';
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
  differenceInCalendarDays,
  max,
  min,
  parseISO,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

/* =====================
   Types
===================== */
interface LeaveReport {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  client_name: string;
  project_name: string;
  start_date: string; // yyyy-MM-dd
  end_date: string;   // yyyy-MM-dd
  hours: number;
  status: 'approved' | 'pending' | 'rejected';
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

/* =====================
   Constants
===================== */
const HOURS_PER_DAY = 8;

const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

const months = [
  { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
  { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
  { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
  { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];

const statusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'default';
    case 'rejected': return 'destructive';
    case 'pending': return 'secondary';
    default: return 'outline';
  }
};

/* =====================
   Helpers (TZ-safe)
===================== */
// IMPORTANT: avoid new Date('yyyy-mm-dd') (timezone bug)
const parseDate = (d: string) => parseISO(d);

const clampOverlapDays = (
  leaveStart: string,
  leaveEnd: string,
  rangeStart: Date,
  rangeEnd: Date
) => {
  const s = max([parseDate(leaveStart), rangeStart]);
  const e = min([parseDate(leaveEnd), rangeEnd]);
  const days = differenceInCalendarDays(e, s) + 1;
  return days > 0 ? days : 0;
};

/* =====================
   Component
===================== */
const ProjectLeaveReports: React.FC = () => {
  const { currentCompany } = useCompany();
  const prevMonth = subMonths(new Date(), 1);

  // Period filters
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'yearly'>('monthly');
  const [year, setYear] = useState(prevMonth.getFullYear().toString());
  const [month, setMonth] = useState(prevMonth.getMonth().toString());
  const [quarter, setQuarter] = useState<'1' | '2' | '3' | '4'>('1');
  const [half, setHalf] = useState<'1' | '2'>('1');

  // Other filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [employeeId, setEmployeeId] = useState<string>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  /* =====================
     Date Range Resolver
  ===================== */
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

  /* =====================
     Employees (searchable dropdown)
  ===================== */
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
    enabled: !!currentCompany?.id
  });

  /* =====================
     Leave Reports
  ===================== */
  const { data: reports = [], isLoading } = useQuery<LeaveReport[]>({
    queryKey: [
      'project-leave-reports',
      periodType,
      year,
      month,
      quarter,
      half,
      statusFilter,
      employeeId,
      employeeSearch,
      clientSearch,
    ],
    queryFn: async () => {
      let query = supabase
        .from('project_leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          total_days,
          status,
          consultant:employees!fk_leave_consultant(id, name, email),
          project:projects(name, client_name)
        `)
        // OVERLAP LOGIC (CRITICAL FIX)
        .lte('start_date', format(dateTo, 'yyyy-MM-dd'))
        .gte('end_date', format(dateFrom, 'yyyy-MM-dd'))
        .order('start_date', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (employeeId !== 'all') query = query.eq('consultant_id', employeeId);

      const { data, error } = await query;
      if (error) {
        toast({ title: 'Error', description: 'Failed to load project leave reports', variant: 'destructive' });
        throw error;
      }

      return (data || [])
        .map((l: any) => {
          const overlapDays = clampOverlapDays(l.start_date, l.end_date, dateFrom, dateTo);

          return {
            id: l.id,
            employee_id: l.consultant?.id,
            employee_name: l.consultant?.name ?? 'Unknown',
            employee_email: l.consultant?.email ?? '',
            client_name: l.project?.client_name ?? '-',
            project_name: l.project?.name ?? 'Unknown Project',
            start_date: l.start_date,
            end_date: l.end_date,
            hours: l.status === 'rejected' ? 0 : overlapDays * HOURS_PER_DAY,
            status: l.status,
          } as LeaveReport;
        })
        .filter(r =>
          r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase()) &&
          r.client_name.toLowerCase().includes(clientSearch.toLowerCase())
        );
    },
    enabled: !!currentCompany?.id,
  });

  /* =====================
     Summary
  ===================== */
  const summary = useMemo(() => {
    const totalHours = reports.reduce((sum, r) => sum + r.hours, 0);
    const employeesCount = new Set(reports.map(r => r.employee_name)).size;
    return { totalHours, employeesCount };
  }, [reports]);

  /* =====================
     Export
  ===================== */
  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(reports.map(r => ({
      Employee: r.employee_name,
      Client: r.client_name,
      'End Client': r.project_name,
      'Start Date': r.start_date,
      'End Date': r.end_date,
      Hours: r.hours,
      Status: r.status,
    })));

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Project Leave Reports');
    XLSX.writeFile(book, `project_leave_reports_${periodType}_${year}.xlsx`);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setEmployeeId('all');
    setEmployeeSearch('');
    setClientSearch('');
  };

  /* =====================
     Render
  ===================== */
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Project Leave Reports</h1>
        <p className="text-sm text-muted-foreground">
          {reports.length} records • {summary.employeesCount} employees • {summary.totalHours} hours
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
        <Select value={periodType} onValueChange={v => setPeriodType(v as any)}>
          <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="half-yearly">Half Yearly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>

        {periodType === 'monthly' && (
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {periodType === 'quarterly' && (
          <Select value={quarter} onValueChange={v => setQuarter(v as any)}>
            <SelectTrigger><SelectValue placeholder="Quarter" /></SelectTrigger>
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
            <SelectTrigger><SelectValue placeholder="Half" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Searchable Employee */}
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name} ({e.email})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input placeholder="Search employee" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} />
        <Input placeholder="Search client" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="h-4 w-4 mr-2" /> Export</Button>
          <Button variant="outline" onClick={clearFilters}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">End Client</th>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">End Date</th>
              <th className="px-4 py-3 text-right">Hours</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No records found</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.employee_name}</div>
                  <div className="text-xs text-muted-foreground">{r.employee_email}</div>
                </td>
                <td className="px-4 py-3">{r.client_name}</td>
                <td className="px-4 py-3">{r.project_name}</td>
                <td className="px-4 py-3">{format(parseDate(r.start_date), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">{format(parseDate(r.end_date), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 text-right font-medium">{r.hours}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectLeaveReports;
