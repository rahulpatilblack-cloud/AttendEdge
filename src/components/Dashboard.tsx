import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Key,
  ShieldCheck,
  Briefcase,
  CalendarCheck,
  FileText
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { OnboardingModal } from './OnboardingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ResetPassword from './ResetPassword';
import { SessionTimeoutModal } from './SessionTimeoutModal';
import { SessionStatusIndicator } from './SessionStatusIndicator';
import { useSession } from '@/contexts/SessionContext';
import { useProjectLeave } from '@/hooks/useProjectLeave';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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
  // Use 'manager' mode for users with admin/manager roles, 'employee' for others
  const isManager = ['admin', 'super_admin', 'reporting_manager'].includes(user?.role || '');
  const { leaveRequests, leaveBalances, pendingRequests, approveLeaveRequest, rejectLeaveRequest, isLoading: leaveLoading, fetchLeaveRequests, fetchLeaveBalances } = useLeave(isManager ? 'manager' : 'employee');
  const { currentCompany } = useCompany();
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';
  const { showTimeoutWarning, setShowTimeoutWarning } = useSession();
  
  // Debug log leave balances
  useEffect(() => {
    console.log('Leave Balances:', leaveBalances);
    if (leaveBalances) {
      console.log('Leave Balances Details:', 
        leaveBalances.map(b => ({
          type: b.leave_types?.name,
          allocated: b.allocated_days,
          used: b.used_days,
          remaining: b.allocated_days - (b.used_days || 0)
        }))
      );
    }
  }, [leaveBalances]);

  // Calculate total leave balance (sum of all leave types' remaining days)
  const totalLeaveBalance = leaveBalances?.reduce((total, balance) => {
    return total + (balance.remaining_days || 0);
  }, 0) || 0;
  
  // Calculate total allocated days (sum of max_days_per_year for active leave types)
  const totalAllocatedDays = leaveBalances?.reduce((total, balance) => {
    return total + (balance.allocated_days || 0);
  }, 0) || 0;
  
  // Calculate total used days
  const totalUsedDays = leaveBalances?.reduce((total, balance) => {
    return total + (balance.used_days || 0);
  }, 0) || 0;
  
  // Count active leave types (those with max_days_per_year > 0)
  const totalActiveLeaveTypes = leaveBalances?.filter(balance => 
    (balance.leave_types?.max_days_per_year || 0) > 0
  ).length || 0;
  
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Refresh all dashboard data when user or company changes
  const refreshDashboardData = async () => {
    if (user && currentCompany) {
      await Promise.all([
        fetchTodayAttendance(),
        fetchRecentAttendance(),
        fetchLeaveRequests(),
        fetchLeaveBalances()
      ]);
    }
  };

  // Refresh data when user or company changes
  useEffect(() => {
    refreshDashboardData();
  }, [user, currentCompany]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckInOut = async () => {
    if (todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
      const success = await checkOut();
      if (success) {
        toast({
          title: "Checked Out",
          description: "You have successfully checked out for today",
        });
      }
    } else {
      const success = await checkIn();
      if (success) {
        toast({
          title: "Checked In",
          description: "You have successfully checked in for today",
        });
      }
    }
  };

  const handleResetPasswordClick = () => {
    setShowResetPassword(true);
  };

  const handleResetPasswordClose = () => {
    setShowResetPassword(false);
  };

  const handleApproveLeave = async (requestId: string) => {
    const success = await approveLeaveRequest(requestId);
    if (success) {
      toast({
        title: "Leave Approved",
        description: "Leave request has been approved successfully",
      });
    }
  };

  const handleRejectLeave = async (requestId: string) => {
    const success = await rejectLeaveRequest(requestId);
    if (success) {
      toast({
        title: "Leave Rejected",
        description: "Leave request has been rejected",
      });
    }
  };

  const getAttendanceStatus = () => {
    if (!todayAttendance) return { status: 'Not Checked In', color: 'text-gray-500', icon: XCircle };
    if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
      return { status: 'Checked In', color: 'text-green-500', icon: CheckCircle };
    }
    if (todayAttendance.check_in_time && todayAttendance.check_out_time) {
      return { status: 'Checked Out', color: 'text-blue-500', icon: Clock };
    }
    return { status: 'Not Checked In', color: 'text-gray-500', icon: XCircle };
  };

  const pendingLeaveRequests = (leaveRequests || []).filter(req => req.status === 'pending').length;

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'reporting_manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const attendanceStatus = getAttendanceStatus();
  const StatusIcon = attendanceStatus.icon;

  if (currentCompany?.name === 'Unassigned') {
    return (
      <OnboardingModal open={showOnboarding} onClose={() => {}} />
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-stretch justify-start" style={{ background: '#fff' }}>
      <div className={`max-w-7xl mx-auto mb-8 p-6 md:p-10 rounded-3xl shadow-xl space-y-6 ${themeClass}`} style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        {/* Welcome Header as Card */}
        <Card className={`${themeClass} card-theme rounded-3xl shadow-2xl p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-0`}>
          <CardContent className="p-0">
            {/* Welcome Header content START */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-lg font-bold mb-1 text-blue-800">Welcome back, {user?.name}</div>
                {currentCompany && (
                  <div className="text-md font-medium mb-1 text-blue-600">{currentCompany.name}</div>
                )}
                <div className="text-4xl font-extrabold text-blue-700 mb-1 flex items-center gap-2">
                  <Clock className="w-7 h-7 text-blue-400 bg-white rounded-full p-1 shadow mr-2" />
                  {currentTime}
                </div>
                <div className="text-gray-500 mb-1 text-lg">{currentDate}</div>
                <div className="text-purple-700 font-semibold text-md">{user?.position}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <SessionStatusIndicator />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshDashboardData}
                  disabled={attendanceLoading || leaveLoading}
                  className="flex items-center gap-2 transition-transform hover:scale-105 shadow-lg"
                >
                  <TrendingUp className="w-4 h-4" />
                  Refresh
                </Button>
                <Button variant="gradient" className="transition-transform hover:scale-105 shadow-lg" onClick={handleCheckInOut}>
                  {todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? 'Check Out' : 'Check In'}
                </Button>
                <Button variant="gradient" className="transition-transform hover:scale-105 shadow-lg" onClick={() => onNavigate?.('project-leave')}>
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
            {/* Welcome Header content END */}
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Status Card */}
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-amber-100 to-orange-70 hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3 shadow-lg ring-4 ring-blue-50">
                  <StatusIcon className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600" >Today's Status</p>
                  <div className="flex items-center mt-2">
                    <span className="text-xl font-extrabold text-green-800 mr-2">{attendanceStatus.status}</span>
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
                    <span className="text-xl font-extrabold text-blue-800 mr-2">
                      {todayAttendance?.check_in_time && todayAttendance?.check_out_time 
                        ? `${Math.round((new Date(todayAttendance.check_out_time).getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                        : todayAttendance?.check_in_time 
                        ? `${Math.round((new Date().getTime() - new Date(todayAttendance.check_in_time).getTime()) / (1000 * 60 * 60) * 10) / 10}h`
                        : '0h'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Leave Card */}
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
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-green-600">
                        {leaveMetrics.approvedCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {leaveMetrics.approvedCount} of {leaveMetrics.approvedCount + projectLeaveBalances} days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Project Leave Card - Only for managers/admins */}
          {/* Team Project Leave Card - Only for managers/admins */}
          {['admin', 'super_admin', 'reporting_manager'].includes(user?.role || '') && (
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
                    <p className="text-md font-semibold text-gray-600">Team Project Leave</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <p className="text-2xl font-bold text-purple-600">{leaveMetrics.teamPendingCount}</p>
                        <p className="text-xs text-purple-700 font-medium">Pending</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                        <p className="text-2xl font-bold text-orange-600">
                          {pendingProjectLeaveRequests.length}
                        </p>
                        <p className="text-xs text-orange-700 font-medium">
                          {pendingProjectLeaveRequests.length === 1 ? 'Request' : 'Requests'}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-2xl font-bold text-red-600">
                          {new Set(pendingProjectLeaveRequests.map((r: any) => r.consultant_id)).size}
                        </p>
                        <p className="text-xs text-red-700 font-medium">
                          {new Set(pendingProjectLeaveRequests.map((r: any) => r.consultant_id)).size === 1 ? 'Member' : 'Members'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Project Leave Metrics Card */}
        <Card 
          className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-emerald-100 to-orange-100 hover:shadow-2xl transition-all duration-150"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-indigo-200 p-3 shadow-lg ring-4 ring-indigo-100">
                <Calendar className="w-7 h-7 text-indigo-700" />
              </div>
              <div className="flex-1">
                <p className="text-md font-semibold text-gray-600 mb-3">My Project Leave - {new Date().toLocaleString('default', { month: 'long' })}</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-indigo-50 rounded-lg">
                    <p className="text-2xl font-bold text-indigo-800">{leaveMetrics.totalThisMonth}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-700">{leaveMetrics.pendingCount}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{leaveMetrics.approvedCount}</p>
                    <p className="text-xs text-gray-500">Approved</p>
                  </div>
                </div>

                {['admin', 'super_admin', 'reporting_manager'].includes(user?.role || '') && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Team Pending Requests</p>
                      <Badge variant="outline" className="bg-white">
                        {leaveMetrics.teamPendingCount}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {(['admin', 'super_admin'].includes(user?.role || '')) && (
        <Card className="bg-gradient-to-br from-slate-50 to-gray-50 from-blue-100 to-white-50 border-0 shadow-lg mb-6 w-full rounded-2xl p-6 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Quick Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
              <Button variant="gradient" onClick={() => onNavigate?.('manage-projects')}>
                <Briefcase className="w-4 h-4 mr-2" />
                Manage Consultant Projects
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('manage-project-leave')}>
                <CalendarCheck className="w-4 h-4 mr-2" />
                Manage Consultant Leave
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('project-reports')}>
                <FileText className="w-4 h-4 mr-2" />
                Consultant Leave Reports
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('project-team-management')}>
                <Users className="w-4 h-4 mr-2" />
                Consultant Directory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Timeout Modal */}
      <SessionTimeoutModal 
        open={showTimeoutWarning} 
        onClose={() => setShowTimeoutWarning(false)} 
      />
    </div>
  );
};

export default Dashboard;
