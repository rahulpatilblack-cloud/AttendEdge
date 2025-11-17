import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PerformanceDashboard = ({ reportData }) => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return null;
  }
  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return null;
  }

  // Process data for charts
  const processChartData = () => {
    if (!reportData || reportData.length === 0) return [];
    
    // Group data by user
    const userData = reportData.reduce((acc, curr) => {
      if (!acc[curr.user_id]) {
        acc[curr.user_id] = {
          name: curr.user,
          submissions: 0,
          interviews: 0,
          offers: 0,
          starts: 0,
          calls: 0,
          linkedin: 0,
          monster: 0,
          dice: 0,
          linkedin_profiles_viewed: 0,
          linkedin_inmails_sent: 0,
          total_call_duration: 0, // store as seconds
        };
      }
      acc[curr.user_id].submissions += curr.total_submissions || 0;
      acc[curr.user_id].interviews += curr.total_interviews || 0;
      acc[curr.user_id].offers += curr.offers || 0;
      acc[curr.user_id].starts += curr.starts || 0;
      acc[curr.user_id].calls += curr.total_calls || 0;
      acc[curr.user_id].linkedin += (curr.linkedin_profiles_viewed || 0) + (curr.linkedin_inmails_sent || 0);
      acc[curr.user_id].monster += curr.monster || 0;
      acc[curr.user_id].dice += curr.dice || 0;
      acc[curr.user_id].linkedin_profiles_viewed += curr.linkedin_profiles_viewed || 0;
      acc[curr.user_id].linkedin_inmails_sent += curr.linkedin_inmails_sent || 0;
      // Convert duration to seconds and sum
      function durationToSeconds(d:string) {
        if (!d) return 0;
        const [h,m,s] = d.split(':').map(Number);
        return (h||0)*3600 + (m||0)*60 + (s||0);
      }
      acc[curr.user_id].total_call_duration += durationToSeconds(curr.total_call_duration);
      return acc;
    }, {});
    // Convert total_call_duration back to hh:mm:ss for display
    Object.values(userData).forEach((user: any) => {
      const sec = user.total_call_duration || 0;
      const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
      user.total_call_duration_display = `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    });
    return Object.values(userData);
  };

  const chartData = processChartData();

  // Data for pie chart (activity distribution)
  const activityData = [
    { name: 'Submissions', value: chartData.reduce((sum, curr) => sum + (curr.submissions || 0), 0) },
    { name: 'Interviews', value: chartData.reduce((sum, curr) => sum + (curr.interviews || 0), 0) },
    { name: 'Offers', value: chartData.reduce((sum, curr) => sum + (curr.offers || 0), 0) },
    { name: 'Starts', value: chartData.reduce((sum, curr) => sum + (curr.starts || 0), 0) },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
      
      {/* Compact Metric Pallets Row */}
      {/* Resource Metrics Row */}
      <div className="flex flex-row flex-wrap gap-2 mb-2">
        {[
          {
            label: 'Monster',
            value: chartData.reduce((sum, curr) => sum + (curr.monster || 0), 0),
            icon: <span role="img" aria-label="Monster">👾</span>,
          },
          {
            label: 'Dice',
            value: chartData.reduce((sum, curr) => sum + (curr.dice || 0), 0),
            icon: <span role="img" aria-label="Dice">🎲</span>,
          },
          {
            label: 'LinkedIn Profiles Viewed',
            value: chartData.reduce((sum, curr) => sum + (curr.linkedin_profiles_viewed || 0), 0),
            icon: <span role="img" aria-label="LinkedIn">🔍</span>,
          },
          {
            label: 'LinkedIn InMails Sent',
            value: chartData.reduce((sum, curr) => sum + (curr.linkedin_inmails_sent || 0), 0),
            icon: <span role="img" aria-label="Mail">✉️</span>,
          },
          {
            label: 'Total Calls',
            value: chartData.reduce((sum, curr) => sum + (curr.calls || 0), 0),
            icon: <span role="img" aria-label="Phone">📞</span>,
          },
          {
            label: 'Total Call Duration',
            value: chartData.reduce((sum, curr) => sum + (curr.total_call_duration || 0), 0) === 0
              ? '0:00:00'
              : (() => {
                const sec = chartData.reduce((sum, curr) => sum + (curr.total_call_duration || 0), 0);
                const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
                return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
              })(),
            icon: <span role="img" aria-label="Timer">⏱️</span>,
          },
        ].map((metric, idx) => (
          <div
            key={metric.label}
            className="flex items-center bg-white rounded shadow-sm px-4 py-2 min-w-[180px] min-h-[60px] border border-gray-200 flex-grow"
            style={{ fontSize: '0.95rem', flex: '1 1 180px' }}
          >
            <span className="mr-2 text-lg">{metric.icon}</span>
            <div>
              <div className="font-semibold text-base leading-tight">{metric.value}</div>
              <div className="text-xs text-gray-500 whitespace-nowrap">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Performance Metrics Row */}
      <div className="flex flex-row flex-wrap gap-2 mb-6">
        {[
          {
            label: 'Total Submissions',
            value: chartData.reduce((sum, curr) => sum + (curr.submissions || 0), 0),
            icon: <span role="img" aria-label="Submit">📤</span>,
          },
          {
            label: 'Total Interviews',
            value: chartData.reduce((sum, curr) => sum + (curr.interviews || 0), 0),
            icon: <span role="img" aria-label="Interview">🎤</span>,
          },
          {
            label: 'Total Offers',
            value: chartData.reduce((sum, curr) => sum + (curr.offers || 0), 0),
            icon: <span role="img" aria-label="Offer">💼</span>,
          },
          {
            label: 'Total Starts',
            value: chartData.reduce((sum, curr) => sum + (curr.starts || 0), 0),
            icon: <span role="img" aria-label="Start">🚀</span>,
          },
        ].map((metric, idx) => (
          <div
            key={metric.label}
            className="flex items-center bg-white rounded shadow-sm px-4 py-2 min-w-[180px] min-h-[60px] border border-gray-200 flex-grow"
            style={{ fontSize: '0.95rem', flex: '1 1 180px' }}
          >
            <span className="mr-2 text-lg">{metric.icon}</span>
            <div>
              <div className="font-semibold text-base leading-tight">{metric.value}</div>
              <div className="text-xs text-gray-500 whitespace-nowrap">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* End Compact Metric Pallets Row */}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Resource Usage by User */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Resource Usage by User</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="monster" fill="#8884d8" name="Monster" />
                <Bar dataKey="dice" fill="#82ca9d" name="Dice" />
                <Bar dataKey="linkedin_profiles_viewed" fill="#ffc658" name="LinkedIn Profiles Viewed" />
                <Bar dataKey="linkedin_inmails_sent" fill="#ff8042" name="LinkedIn InMails Sent" />
                <Bar dataKey="calls" fill="#0088FE" name="Total Calls" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {/* Submissions by User */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Submissions by User</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="submissions" fill="#0088FE" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Distribution */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Over Time */}
        <Card className="p-4 md:col-span-2">
          <CardHeader>
            <CardTitle>Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="submissions" stroke="#8884d8" name="Submissions" />
                <Line type="monotone" dataKey="interviews" stroke="#82ca9d" name="Interviews" />
                <Line type="monotone" dataKey="offers" stroke="#ffc658" name="Offers" />
                <Line type="monotone" dataKey="starts" stroke="#ff8042" name="Starts" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
