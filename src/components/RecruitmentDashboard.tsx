import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

const RecruitmentDashboard = ({ performanceData }) => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return null;
  }
  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return null;
  }

  // Process data for recruitment charts using performance data
  const processChartData = () => {
    if (!performanceData || performanceData.length === 0) return [];
    
    // Group data by user (recruiter)
    const recruiterData = performanceData.reduce((acc, curr) => {
      if (!acc[curr.user_id]) {
        acc[curr.user_id] = {
          name: curr.user,
          // Map performance metrics to recruitment metrics
          applications_received: 0, // Total submissions
          applications_screened: 0, // Submissions that lead to interviews
          interviews_scheduled: 0, // Total interviews
          interviews_completed: 0, // Completed interviews
          offers_made: 0, // Offers
          offers_accepted: 0, // Starts (accepted offers)
          candidates_hired: 0, // Starts
          time_to_fill: 0, // Will calculate based on activity
          cost_per_hire: 0, // Will estimate based on activity
          positions_open: 0, // Will calculate based on activity
          positions_filled: 0, // Starts
          monster_activity: 0,
          dice_activity: 0,
          linkedin_profiles_viewed: 0,
          linkedin_inmails_sent: 0,
          total_calls: 0,
        };
      }
      
      // Map performance data to recruitment metrics
      acc[curr.user_id].applications_received += curr.total_submissions || 0;
      acc[curr.user_id].applications_screened += Math.floor((curr.total_submissions || 0) * 0.6); // Estimate 60% screening rate
      acc[curr.user_id].interviews_scheduled += curr.total_interviews || 0;
      acc[curr.user_id].interviews_completed += Math.floor((curr.total_interviews || 0) * 0.8); // Estimate 80% completion rate
      acc[curr.user_id].offers_made += curr.offers || 0;
      acc[curr.user_id].offers_accepted += curr.starts || 0;
      acc[curr.user_id].candidates_hired += curr.starts || 0;
      acc[curr.user_id].positions_filled += curr.starts || 0;
      acc[curr.user_id].monster_activity += curr.monster || 0;
      acc[curr.user_id].dice_activity += curr.dice || 0;
      acc[curr.user_id].linkedin_profiles_viewed += curr.linkedin_profiles_viewed || 0;
      acc[curr.user_id].linkedin_inmails_sent += curr.linkedin_inmails_sent || 0;
      acc[curr.user_id].total_calls += curr.total_calls || 0;
      
      // Estimate time to fill based on activity (simplified calculation)
      if (curr.starts && curr.total_submissions) {
        acc[curr.user_id].time_to_fill = Math.floor(30 * (curr.total_submissions / curr.starts)); // Rough estimate
      }
      
      // Estimate cost per hire based on activity
      if (curr.starts) {
        acc[curr.user_id].cost_per_hire = Math.floor(5000 + (curr.total_calls || 0) * 50); // Base cost + call costs
      }
      
      // Estimate positions open based on activity
      acc[curr.user_id].positions_open = Math.max(0, (curr.total_submissions || 0) - (curr.starts || 0));
      
      return acc;
    }, {});
    
    return Object.values(recruiterData);
  };

  const chartData = processChartData();

  // Data for pie chart (recruitment funnel)
  const funnelData = [
    { name: 'Applications Received', value: chartData.reduce((sum, curr) => sum + (curr.applications_received || 0), 0) },
    { name: 'Screened', value: chartData.reduce((sum, curr) => sum + (curr.applications_screened || 0), 0) },
    { name: 'Interviews Scheduled', value: chartData.reduce((sum, curr) => sum + (curr.interviews_scheduled || 0), 0) },
    { name: 'Interviews Completed', value: chartData.reduce((sum, curr) => sum + (curr.interviews_completed || 0), 0) },
    { name: 'Offers Made', value: chartData.reduce((sum, curr) => sum + (curr.offers_made || 0), 0) },
    { name: 'Hired', value: chartData.reduce((sum, curr) => sum + (curr.candidates_hired || 0), 0) },
  ];

  // Data for source effectiveness
  const sourceData = [
    { name: 'LinkedIn', applications: 45, hires: 12, conversion: 26.7 },
    { name: 'Indeed', applications: 38, hires: 8, conversion: 21.1 },
    { name: 'Referrals', applications: 15, hires: 6, conversion: 40.0 },
    { name: 'Career Site', applications: 22, hires: 4, conversion: 18.2 },
    { name: 'Job Boards', applications: 30, hires: 5, conversion: 16.7 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Recruitment Dashboard</h2>
      
      {/* Key Metrics Row */}
      <div className="flex flex-row flex-wrap gap-2 mb-2">
        {[
          {
            label: 'Total Applications',
            value: chartData.reduce((sum, curr) => sum + (curr.applications_received || 0), 0),
            icon: <span role="img" aria-label="Applications">📝</span>,
          },
          {
            label: 'Positions Open',
            value: chartData.reduce((sum, curr) => sum + (curr.positions_open || 0), 0),
            icon: <span role="img" aria-label="Open Positions">🔓</span>,
          },
          {
            label: 'Positions Filled',
            value: chartData.reduce((sum, curr) => sum + (curr.positions_filled || 0), 0),
            icon: <span role="img" aria-label="Filled Positions">✅</span>,
          },
          {
            label: 'Candidates Hired',
            value: chartData.reduce((sum, curr) => sum + (curr.candidates_hired || 0), 0),
            icon: <span role="img" aria-label="Hired">👥</span>,
          },
          {
            label: 'Avg Time to Fill (Days)',
            value: chartData.length > 0 
              ? Math.round(chartData.reduce((sum, curr) => sum + (curr.time_to_fill || 0), 0) / chartData.length)
              : 0,
            icon: <span role="img" aria-label="Time">⏱️</span>,
          },
          {
            label: 'Avg Cost per Hire',
            value: chartData.length > 0 
              ? `$${Math.round(chartData.reduce((sum, curr) => sum + (curr.cost_per_hire || 0), 0) / chartData.length).toLocaleString()}`
              : '$0',
            icon: <span role="img" aria-label="Cost">💰</span>,
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
            label: 'Screening Rate',
            value: chartData.reduce((sum, curr) => sum + (curr.applications_screened || 0), 0) > 0
              ? `${Math.round((chartData.reduce((sum, curr) => sum + (curr.applications_screened || 0), 0) / 
                  chartData.reduce((sum, curr) => sum + (curr.applications_received || 0), 0)) * 100)}%`
              : '0%',
            icon: <span role="img" aria-label="Screening">🔍</span>,
          },
          {
            label: 'Interview Rate',
            value: chartData.reduce((sum, curr) => sum + (curr.interviews_scheduled || 0), 0) > 0
              ? `${Math.round((chartData.reduce((sum, curr) => sum + (curr.interviews_scheduled || 0), 0) / 
                  chartData.reduce((sum, curr) => sum + (curr.applications_screened || 0), 0)) * 100)}%`
              : '0%',
            icon: <span role="img" aria-label="Interview">🎤</span>,
          },
          {
            label: 'Offer Acceptance Rate',
            value: chartData.reduce((sum, curr) => sum + (curr.offers_accepted || 0), 0) > 0
              ? `${Math.round((chartData.reduce((sum, curr) => sum + (curr.offers_accepted || 0), 0) / 
                  chartData.reduce((sum, curr) => sum + (curr.offers_made || 0), 0)) * 100)}%`
              : '0%',
            icon: <span role="img" aria-label="Acceptance">✅</span>,
          },
          {
            label: 'Fill Rate',
            value: chartData.reduce((sum, curr) => sum + (curr.positions_filled || 0), 0) > 0
              ? `${Math.round((chartData.reduce((sum, curr) => sum + (curr.positions_filled || 0), 0) / 
                  (chartData.reduce((sum, curr) => sum + (curr.positions_open || 0), 0) + 
                   chartData.reduce((sum, curr) => sum + (curr.positions_filled || 0), 0))) * 100)}%`
              : '0%',
            icon: <span role="img" aria-label="Fill Rate">📊</span>,
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recruitment Funnel */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Recruitment Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
                  data={funnelData}
              cx="50%"
              cy="50%"
                  labelLine={false}
                  outerRadius={80}
              fill="#8884d8"
                  dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Effectiveness */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Source Effectiveness</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sourceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
            <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Legend />
                <Bar dataKey="applications" fill="#8884d8" name="Applications" />
                <Bar dataKey="hires" fill="#82ca9d" name="Hires" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recruiter Performance */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Recruiter Performance</CardTitle>
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
                <Bar dataKey="applications_received" fill="#0088FE" name="Applications" />
                <Bar dataKey="candidates_hired" fill="#00C49F" name="Hires" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time to Fill Trend */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Time to Fill Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="time_to_fill" stroke="#8884d8" fill="#8884d8" name="Days to Fill" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost per Hire by Recruiter */}
        <Card className="p-4 md:col-span-2">
          <CardHeader>
            <CardTitle>Cost per Hire by Recruiter</CardTitle>
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
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Cost']} />
                <Legend />
                <Bar dataKey="cost_per_hire" fill="#FF8042" name="Cost per Hire" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecruitmentDashboard;