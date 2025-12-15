import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface LeaveReport {
  id: string;
  employee_name: string;
  employee_email: string;
  client_name: string;
  project_name: string;
  start_date: string;
  end_date: string;
  hours: number;
  status: 'approved' | 'pending' | 'rejected';
}

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

const ProjectLeaveReports: React.FC = () => {
  const { currentCompany } = useCompany();
  const prevMonth = subMonths(new Date(), 1);

  const [year, setYear] = useState(prevMonth.getFullYear().toString());
  const [month, setMonth] = useState(prevMonth.getMonth().toString());
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const dateFrom = startOfMonth(new Date(Number(year), Number(month)));
  const dateTo = endOfMonth(new Date(Number(year), Number(month)));

  const { data: reports = [], isLoading } = useQuery<LeaveReport[]>({
    queryKey: ['project-leave-reports', year, month, statusFilter, employeeSearch, clientSearch],
    enabled: !!currentCompany?.id,
    queryFn: async () => {
      let query = supabase
        .from('project_leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          total_days,
          status,
          consultant:employees!fk_leave_consultant(name, email),
          project:projects(name, client_name)
        `)
        .gte('start_date', format(dateFrom, 'yyyy-MM-dd'))
        .lte('end_date', format(dateTo, 'yyyy-MM-dd'))
        .order('start_date', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) {
        toast({ title: 'Error', description: 'Failed to load project leave reports', variant: 'destructive' });
        throw error;
      }

      return (data || [])
        .map((l: any) => ({
          id: l.id,
          employee_name: l.consultant?.name ?? 'Unknown',
          employee_email: l.consultant?.email ?? '',
          client_name: l.project?.client_name ?? '-',
          project_name: l.project?.name ?? 'Unknown Project',
          start_date: l.start_date,
          end_date: l.end_date,
          hours: l.total_days * HOURS_PER_DAY,
          status: l.status,
        }))
        .filter((r) =>
          r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase()) &&
          r.client_name.toLowerCase().includes(clientSearch.toLowerCase())
        );
    },
  });

  const summary = useMemo(() => {
    const totalHours = reports.reduce((sum, r) => sum + r.hours, 0);
    const employees = new Set(reports.map(r => r.employee_name)).size;
    return { totalHours, employees };
  }, [reports]);

  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(reports.map(r => ({
      Employee: r.employee_name,
      Client: r.client_name,
      Project: r.project_name,
      'Start Date': r.start_date,
      'End Date': r.end_date,
      Hours: r.hours,
      Status: r.status,
    })));

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Project Leave Reports');
    XLSX.writeFile(book, `project_leave_reports_${year}_${Number(month) + 1}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Project Leave Reports</h1>
        <p className="text-sm text-muted-foreground">
          {reports.length} records • {summary.employees} employees • {summary.totalHours} hours
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Select value={year} onValueChange={setYear}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Input placeholder="Search employee" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
        <Input placeholder="Search client" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
        <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="h-4 w-4 mr-2" /> Export</Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">End Date</th>
              <th className="px-4 py-3 text-right">Hours</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              : reports.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No records found</td></tr>
              : reports.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.employee_name}</div>
                    <div className="text-xs text-muted-foreground">{r.employee_email}</div>
                  </td>
                  <td className="px-4 py-3">{r.client_name}</td>
                  <td className="px-4 py-3">{r.project_name}</td>
                  <td className="px-4 py-3">{format(new Date(r.start_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">{format(new Date(r.end_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.hours}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectLeaveReports;
