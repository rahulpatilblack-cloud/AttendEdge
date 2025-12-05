import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';

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
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const fetchLeaveReports = async () => {
    if (!currentCompany) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_project_leave_reports', {
          company_id: currentCompany.id,
          start_date: dateRange.from.toISOString(),
          end_date: dateRange.to.toISOString()
        });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching leave reports:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Project Leave Reports</h1>
        <DateRangePicker
          onUpdate={({ range }) => setDateRange(range)}
          initialDateFrom={dateRange.from}
          initialDateTo={dateRange.to}
          align="end"
          showCompare={false}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="project">By Project</TabsTrigger>
          <TabsTrigger value="leave-type">By Leave Type</TabsTrigger>
        </TabsList>

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
