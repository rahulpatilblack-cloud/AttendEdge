import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format, subMonths } from 'date-fns';
import { Download, FileText, FileSpreadsheet, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Users, PieChart as PieChartIcon, BarChart2, LineChart as LineChartIcon, Filter, Save, Send, Bell } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

type LeaveReport = {
  id: string;
  employee_name: string;
  project_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ProjectLeaveReports = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<LeaveReport[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    project: '',
    employee: ''
  });
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'weekly',
    dayOfWeek: 'monday',
    time: '09:00',
    email: ''
  });

  const fetchLeaveReports = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      // Direct query to fetch leave reports with related data
      // First, get the leave requests with basic info
      const { data: leaveRequests, error } = await supabase
        .from('project_leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          total_days,
          status,
          reason,
          consultant_id,
          project_id,
          leave_type_id
        `)
        .gte('start_date', dateRange.from.toISOString())
        .lte('end_date', dateRange.to.toISOString())
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Get unique consultant and project IDs
      const consultantIds = [...new Set(leaveRequests?.map(r => r.consultant_id).filter(Boolean))];
      const projectIds = [...new Set(leaveRequests?.map(r => r.project_id).filter(Boolean))];
      const leaveTypeIds = [...new Set(leaveRequests?.map(r => r.leave_type_id).filter(Boolean))];

      // Fetch related data in parallel
      const [
        { data: consultants },
        { data: projects },
        { data: leaveTypes }
      ] = await Promise.all([
        consultantIds.length > 0 ? 
          supabase.from('employees').select('id, name, email').in('id', consultantIds) : 
          { data: [] },
        projectIds.length > 0 ? 
          supabase.from('projects').select('id, name').in('id', projectIds) : 
          { data: [] },
        leaveTypeIds.length > 0 ?
          supabase.from('leave_types').select('id, name').in('id', leaveTypeIds) :
          { data: [] }
      ]);

      // Create lookup maps
      const consultantsMap = new Map(consultants?.map(c => [c.id, c]));
      const projectsMap = new Map(projects?.map(p => [p.id, p]));
      const leaveTypesMap = new Map(leaveTypes?.map(lt => [lt.id, lt]));

      // Combine the data
      const data = (leaveRequests || []).map(request => ({
        ...request,
        employee: consultantsMap.get(request.consultant_id) || { name: 'Unknown', email: '' },
        project: projectsMap.get(request.project_id) || { name: 'No Project' },
        leave_type: leaveTypesMap.get(request.leave_type_id) || { name: 'Unknown' }
      }));

      if (error) throw error;
      
      // Map to the expected format
      const transformedData = data.map((item: any) => ({
        id: item.id,
        employee_name: item.employee?.name || 'Unknown',
        project_name: item.project?.name || 'No Project',
        leave_type: item.leave_type?.name || 'Unknown',
        start_date: item.start_date,
        end_date: item.end_date,
        total_days: item.total_days,
        status: item.status
      }));

      // Apply additional filters
      let filteredData = transformedData;
      if (filters.status) {
        filteredData = filteredData.filter(r => r.status === filters.status);
      }
      if (filters.project) {
        filteredData = filteredData.filter(r => r.project_name === filters.project);
      }
      if (filters.employee) {
        filteredData = filteredData.filter(r => r.employee_name === filters.employee);
      }
      
      setReports(filteredData);
    } catch (error) {
      console.error('Error fetching leave reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Reports');
    XLSX.writeFile(workbook, `Leave_Reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Project Leave Reports', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Date Range: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`,
      14,
      30
    );

    // Table
    const headers = [['Employee', 'Project', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status']];
    const data = reports.map(report => [
      report.employee_name,
      report.project_name,
      report.leave_type,
      format(new Date(report.start_date), 'MMM d, yyyy'),
      format(new Date(report.end_date), 'MMM d, yyyy'),
      report.total_days.toString(),
      report.status
    ]);

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`Leave_Reports_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Get unique values for filters
  const uniqueStatuses = [...new Set(reports.map(r => r.status))];
  const uniqueProjects = [...new Set(reports.map(r => r.project_name))];
  const uniqueEmployees = [...new Set(reports.map(r => r.employee_name))];

  // Calculate approval metrics
  const approvalMetrics = reports.reduce((acc, report) => {
    if (!acc[report.status]) {
      acc[report.status] = 0;
    }
    acc[report.status]++;
    return acc;
  }, {} as Record<string, number>);

  const totalRequests = reports.length;
  const approvalRate = totalRequests > 0 
    ? Math.round(((approvalMetrics['approved'] || 0) / totalRequests) * 100) 
    : 0;

  useEffect(() => {
    fetchLeaveReports();
  }, [dateRange, currentCompany]);

  // Process data for charts
  const processChartData = () => {
    // Group by employee
    const byEmployee = reports.reduce((acc, report) => {
      if (!acc[report.employee_name]) {
        acc[report.employee_name] = 0;
      }
      acc[report.employee_name] += report.total_days;
      return acc;
    }, {} as Record<string, number>);

    // Group by project
    const byProject = reports.reduce((acc, report) => {
      if (!acc[report.project_name]) {
        acc[report.project_name] = 0;
      }
      acc[report.project_name] += report.total_days;
      return acc;
    }, {} as Record<string, number>);

    // Group by leave type
    const byLeaveType = reports.reduce((acc, report) => {
      if (!acc[report.leave_type]) {
        acc[report.leave_type] = 0;
      }
      acc[report.leave_type] += report.total_days;
      return acc;
    }, {} as Record<string, number>);

    return {
      byEmployee: Object.entries(byEmployee).map(([name, days]) => ({
        name,
        days,
      })),
      byProject: Object.entries(byProject).map(([name, days]) => ({
        name,
        days,
      })),
      byLeaveType: Object.entries(byLeaveType).map(([name, days]) => ({
        name,
        days,
      })),
    };
  };

  const { byEmployee, byProject, byLeaveType } = processChartData();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Project Leave Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            {reports.length} records found • {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DateRangePicker
            onUpdate={({ range }) => setDateRange(range)}
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            align="end"
            showCompare={false}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={filters.project}
          onChange={(e) => setFilters({...filters, project: e.target.value})}
        >
          <option value="">All Projects</option>
          {uniqueProjects.map(project => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={filters.employee}
          onChange={(e) => setFilters({...filters, employee: e.target.value})}
        >
          <option value="">All Employees</option>
          {uniqueEmployees.map(employee => (
            <option key={employee} value={employee}>
              {employee}
            </option>
          ))}
        </select>

        {(filters.status || filters.project || filters.employee) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilters({status: '', project: '', employee: ''})}
            className="text-xs h-7"
          >
            Clear filters
          </Button>
        )}
      </div>

      <Tabs 
        defaultValue="overview" 
        className="space-y-4"
        onValueChange={setActiveTab}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <PieChartIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="employee" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">By Employee</span>
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">By Project</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <LineChartIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'overview' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Approved: {approvalMetrics['approved'] || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Rejected: {approvalMetrics['rejected'] || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Pending: {approvalMetrics['pending'] || 0}</span>
              </div>
              <div className="hidden md:flex items-center gap-1">
                <span>Approval Rate: {approvalRate}%</span>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.reduce((sum, report) => sum + report.total_days, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees on Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(reports.map(r => r.employee_name)).size}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects Affected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(reports.map(r => r.project_name)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leave Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byLeaveType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="days"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {byLeaveType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} days`, 'Days']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee">
          <Card>
            <CardHeader>
              <CardTitle>Leave Days by Employee</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byEmployee}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} days`, 'Total Days']} />
                  <Legend />
                  <Bar dataKey="days" name="Leave Days" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project">
          <Card>
            <CardHeader>
              <CardTitle>Leave Days by Project</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byProject}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} days`, 'Total Days']} />
                  <Legend />
                  <Bar dataKey="days" name="Leave Days" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave-type">
          <Card>
            <CardHeader>
              <CardTitle>Leave Days by Type</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byLeaveType}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} days`, 'Total Days']} />
                  <Legend />
                  <Bar dataKey="days" name="Leave Days" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectLeaveReports;
