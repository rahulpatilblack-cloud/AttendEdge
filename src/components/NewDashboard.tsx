import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useCompany } from '@/contexts/CompanyContext';
import { useProjectLeave } from '@/hooks/useProjectLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLogger } from '@/utils/auditLogger';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ResetPassword from '@/components/ResetPassword';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Key,
  Briefcase,
  CalendarCheck,
  FileText,
  CalendarPlus,
  ClipboardList,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  Activity,
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const NewDashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading: attendanceLoading, fetchTodayAttendance, fetchRecentAttendance } = useAttendance();
  const { 
    projectLeaveBalances = 0, 
    pendingProjectLeaveRequests = [], 
    leaveMetrics = { 
      totalThisMonth: 0, 
      pendingCount: 0, 
      approvedCount: 0, 
      teamPendingCount: 0 
    }, 
    isLoading: isProjectLeaveLoading 
  } = useProjectLeave();
  
  // Use 'manager' mode for users with admin/manager roles
  const isManager = ['admin', 'super_admin', 'reporting_manager'].includes(user?.role || '');
  const { leaveRequests, leaveBalances, pendingRequests, approveLeaveRequest, rejectLeaveRequest, isLoading: leaveLoading, fetchLeaveRequests, fetchLeaveBalances } = useLeave(isManager ? 'manager' : 'employee');
  const { currentCompany } = useCompany();
  const { theme } = useTheme();
  const { logUserAction, logPerformance } = useAuditLogger();
  const navigate = useNavigate();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';
  
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // HR-specific data fetching
  const { data: hrMetrics, isLoading: hrMetricsLoading, refetch: refetchHrMetrics } = useQuery({
    queryKey: ['hr-metrics', currentCompany?.id],
    queryFn: async () => {
      const startTime = Date.now();
      
      if (!currentCompany?.id) {
        throw new Error('Company not found');
      }

      // Fetch today's leave entries
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEntries, error: entriesError } = await supabase
        .from('project_leaves')
        .select('id, consultant_id, hours, date, status, employees:consultant_id(name, email)')
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(10);

      if (entriesError) throw entriesError;

      // Fetch total consultants
      const { data: consultants, error: consultantsError } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('company_id', currentCompany.id);

      if (consultantsError) throw consultantsError;

      // Fetch active projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (projectsError) throw projectsError;

      // Fetch recent leave requests (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentRequests, error: recentError } = await supabase
        .from('project_leaves')
        .select('id, consultant_id, date, hours, status, notes, employees:consultant_id(name, email)')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      const metricsData = {
        todayLeaveEntries: todayEntries || [],
        totalConsultants: consultants?.length || 0,
        activeProjects: projects?.length || 0,
        recentRequests: recentRequests || []
      };

      // Log performance
      const duration = Date.now() - startTime;
      logPerformance('hr-metrics-fetch', duration, 1);

      logUserAction('VIEW_HR_DASHBOARD', 'new-dashboard', {
        metricsFetched: Object.keys(metricsData).length,
        duration
      });

      return metricsData;
    },
    enabled: !!currentCompany?.id && isManager,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Calculate total leave balance (from current dashboard)
  const totalLeaveBalance = leaveBalances?.reduce((total, balance) => {
    return total + (balance.remaining_days || 0);
  }, 0) || 0;
  
  const totalAllocatedDays = leaveBalances?.reduce((total, balance) => {
    return total + (balance.allocated_days || 0);
  }, 0) || 0;
  
  const totalUsedDays = leaveBalances?.reduce((total, balance) => {
    return total + (balance.used_days || 0);
  }, 0) || 0;

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current date in readable format
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get attendance status (from current dashboard)
  const getAttendanceStatus = () => {
    if (!todayAttendance?.check_in_time) {
      return { status: 'Not Checked In', icon: Clock, color: 'text-gray-600' };
    }
    if (todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
      return { status: 'Checked In', icon: CheckCircle, color: 'text-green-600' };
    }
    if (todayAttendance?.check_out_time) {
      return { status: 'Checked Out', icon: XCircle, color: 'text-blue-600' };
    }
    return { status: 'Unknown', icon: AlertCircle, color: 'text-gray-600' };
  };

  const attendanceStatus = getAttendanceStatus();
  const StatusIcon = attendanceStatus.icon;

  // Calculate working hours (from current dashboard)
  const getWorkingHours = () => {
    if (todayAttendance?.check_in_time && todayAttendance?.check_out_time) {
      const hours = (new Date(todayAttendance.check_out_time).getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60);
      return `${Math.round(hours * 10) / 10}h`;
    } else if (todayAttendance?.check_in_time) {
      const hours = (new Date().getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60);
      return `${Math.round(hours * 10) / 10}h`;
    }
    return '0h';
  };

  // HR Quick Actions
  const hrQuickActions = [
    {
      id: 'mark-leave',
      title: 'Mark Leave Entry',
      description: 'Record consultant leave hours',
      icon: <CalendarPlus className="h-5 w-5" />,
      route: '/mark-project-leave-hours',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'manage-leave',
      title: 'Manage Consultant Leave',
      description: 'Approve/reject leave requests',
      icon: <ClipboardList className="h-5 w-5" />,
      route: '/manage-project-leave',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'allocations',
      title: 'Project Leave Allocations',
      description: 'Manage project assignments',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      route: '/project-allocations',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'leave-report',
      title: 'Leave Report (HR)',
      description: 'View leave analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/leave-report-hr',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'consultants',
      title: 'Consultant Directory',
      description: 'Manage team members',
      icon: <Users className="h-5 w-5" />,
      route: '/project-team-management',
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'projects',
      title: 'Project Directory',
      description: 'Manage projects',
      icon: <Briefcase className="h-5 w-5" />,
      route: '/manage-projects',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  const handleCheckInOut = async () => {
    try {
      if (todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
        await checkOut();
        toast({
          title: 'Checked Out Successfully',
          description: 'Have a great day!',
        });
      } else {
        await checkIn();
        toast({
          title: 'Checked In Successfully',
          description: 'Welcome to work!',
        });
      }
    } catch (error) {
      toast({
        title: 'Check In/Out Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleResetPasswordClick = () => {
    setShowResetPassword(true);
  };

  const handleResetPasswordClose = () => {
    setShowResetPassword(false);
  };

  const refreshDashboardData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchTodayAttendance(),
        fetchRecentAttendance(),
        fetchLeaveRequests(),
        fetchLeaveBalances(),
        refetchHrMetrics()
      ]);
      toast({
        title: 'Dashboard Refreshed',
        description: 'All data has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Could not update some data.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuickAction = (action: typeof hrQuickActions[0]) => {
    logUserAction('QUICK_ACTION_CLICK', 'new-dashboard', {
      actionId: action.id,
      actionTitle: action.title
    });
    navigate(action.route);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveLeaveRequest(requestId);
      toast({
        title: 'Leave Approved',
        description: 'The leave request has been approved.',
      });
    } catch (error) {
      toast({
        title: 'Approval Failed',
        description: 'Could not approve the request.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectLeaveRequest(requestId);
      toast({
        title: 'Leave Rejected',
        description: 'The leave request has been rejected.',
      });
    } catch (error) {
      toast({
        title: 'Rejection Failed',
        description: 'Could not reject the request.',
        variant: 'destructive',
      });
    }
  };

  if (!currentCompany) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Company Data...</h2>
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full gradient-page">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Header - From Current Dashboard */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-page-title mb-1">HR Leave Management Dashboard</div>
                <div className="text-body font-medium mb-1">{currentCompany.name}</div>
                <div className="text-4xl font-extrabold text-blue-700 mb-1 flex items-center gap-2">
                  <Clock className="icon-card text-blue-400 bg-white rounded-full p-1 shadow mr-2" />
                  {currentTime}
                </div>
                <div className="text-muted mb-1 text-lg">{currentDate}</div>
                <div className="text-purple-700 font-semibold text-md">{user?.position}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <Button 
                  variant="gradient" 
                  size="sm" 
                  onClick={refreshDashboardData}
                  disabled={attendanceLoading || leaveLoading || isRefreshing}
                  className="interactive flex items-center gap-2"
                >
                  <RefreshCw className={`icon-inline ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="gradient" className="interactive" onClick={handleCheckInOut}>
                  {todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? 'Check Out' : 'Check In'}
                </Button>
                <Button variant="gradient" className="interactive" onClick={() => onNavigate?.('project-leave')}>
                  Request Project Leave
                </Button>
                <Button 
                  variant="gradient" 
                  className="transition-transform hover:scale-105 shadow-lg flex items-center gap-1"
                  onClick={handleResetPasswordClick}
                >
                  <Key className="w-4 h-4" />
                  Reset Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Password Dialog */}
        <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <ResetPassword 
              email={user?.email || ''} 
              onCancel={handleResetPasswordClose}
              onSuccess={handleResetPasswordClose}
            />
          </DialogContent>
        </Dialog>

        {/* Personal Status Cards - From Current Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Status Card */}
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-amber-100 to-orange-70 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3 shadow-lg ring-4 ring-blue-50">
                  <StatusIcon className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600">Today's Status</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-xl font-extrabold ${attendanceStatus.color} mr-2`}>{attendanceStatus.status}</span>
                    {todayAttendance?.check_in_time && (
                      <Badge className="ml-1 bg-green-500 text-white">Checked In</Badge>
                    )}
                  </div>
                  {todayAttendance?.check_in_time && (
                    <p className="text-sm text-gray-500 mt-1">
                      at {new Date(todayAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours Card */}
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-emerald-100 to-red-70 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-100 p-3 shadow-lg ring-4 ring-emerald-50">
                  <Clock className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600">Working Hours</p>
                  <div className="flex items-center mt-2">
                    <span className="text-xl font-extrabold text-blue-800 mr-2">{getWorkingHours()}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Leave Card */}
          <Card 
            className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-orange-100 to-yellow-70 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1 cursor-pointer"
            onClick={() => onNavigate?.('project-leave')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-violet-100 p-3 shadow-lg ring-4 ring-violet-50">
                  <Calendar className="w-7 h-7 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-md font-semibold text-gray-600">Project Leave</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-2xl font-extrabold text-teal-800">
                        {projectLeaveBalances} {projectLeaveBalances === 1 ? 'day' : 'days'}
                      </p>
                      <p className="text-xs text-gray-500">Remaining</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-amber-600">
                        {leaveMetrics.pendingCount}
                      </p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Project Leave Card */}
          {isManager && (
            <Card 
              className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-purple-100 to-orange-70 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1 cursor-pointer"
              onClick={() => onNavigate?.('manage-project-leave')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-purple-100 p-3 shadow-lg ring-4 ring-purple-50">
                    <Users className="w-7 h-7 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-md font-semibold text-gray-600">Team Leave</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <p className="text-2xl font-bold text-purple-600">{leaveMetrics.teamPendingCount}</p>
                        <p className="text-xs text-purple-700 font-medium">Pending</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <p className="text-2xl font-bold text-orange-600">
                          {pendingProjectLeaveRequests.length}
                        </p>
                        <p className="text-xs text-orange-700 font-medium">Requests</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* HR Management Section */}
        {isManager && (
          <>
            {/* HR Quick Actions */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-section-heading flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  HR Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hrQuickActions.map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className={`h-auto p-4 text-white bg-gradient-to-r ${action.color} hover:shadow-lg transition-all duration-300`}
                    >
                      <div className="flex flex-col items-center gap-3 w-full">
                        <div className="p-3 bg-white bg-opacity-20 rounded-full">
                          {action.icon}
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{action.title}</div>
                          <div className="text-xs opacity-90 mt-1">{action.description}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* HR Metrics Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Leave Entries */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-section-heading flex items-center gap-2">
                    <CalendarPlus className="h-5 w-5" />
                    Today's Leave Entries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hrMetricsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : hrMetrics?.todayLeaveEntries && hrMetrics.todayLeaveEntries.length > 0 ? (
                    <div className="space-y-3">
                      {hrMetrics.todayLeaveEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{entry.employees?.name}</p>
                              <p className="text-xs text-gray-500">{entry.hours} hours</p>
                            </div>
                          </div>
                          <Badge className={
                            entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                            entry.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {entry.status}
                          </Badge>
                        </div>
                      ))}
                      {hrMetrics.todayLeaveEntries.length > 5 && (
                        <p className="text-sm text-gray-500 text-center">
                          +{hrMetrics.todayLeaveEntries.length - 5} more entries today
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No leave entries today</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Leave Requests */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-section-heading flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Recent Leave Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hrMetricsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : hrMetrics?.recentRequests && hrMetrics.recentRequests.length > 0 ? (
                    <div className="space-y-3">
                      {hrMetrics.recentRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{request.employees?.name}</p>
                              <p className="text-xs text-gray-500">{new Date(request.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleApproveRequest(request.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleRejectRequest(request.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            <Badge className={
                              request.status === 'approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {request.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No recent requests</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Team Overview */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-section-heading flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Team Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hrMetricsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">Total Consultants</span>
                        </div>
                        <span className="text-xl font-bold text-blue-600">{hrMetrics?.totalConsultants || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <Briefcase className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="font-medium">Active Projects</span>
                        </div>
                        <span className="text-xl font-bold text-green-600">{hrMetrics?.activeProjects || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-full">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium">Pending Requests</span>
                        </div>
                        <span className="text-xl font-bold text-purple-600">{leaveMetrics.teamPendingCount}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewDashboard;
