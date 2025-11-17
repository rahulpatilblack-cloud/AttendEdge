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
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { OnboardingModal } from './OnboardingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ResetPassword from './ResetPassword';
import { SessionTimeoutModal } from './SessionTimeoutModal';
import { SessionStatusIndicator } from './SessionStatusIndicator';
import { useSession } from '@/contexts/SessionContext';

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading: attendanceLoading, fetchTodayAttendance, fetchRecentAttendance } = useAttendance();
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
                <Button variant="gradient" className="transition-transform hover:scale-105 shadow-lg" onClick={() => onNavigate?.('leave')}>
                  Request Leave
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
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-green-100 to-blue-50 hover:shadow-2xl transition-all duration-150 group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-200 p-3 shadow-lg ring-4 ring-green-100">
                  <StatusIcon className={`w-7 h-7 text-green-700`} />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600">Today's Status</p>
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

          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-blue-100 to-cyan-50 hover:shadow-2xl transition-all duration-150 group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-200 p-3 shadow-lg ring-4 ring-blue-100">
                  <Clock className="w-7 h-7 text-blue-700" />
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

          {/* Leave Balance Card - Show if there are active leave types */}
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-purple-100 to-indigo-50 hover:shadow-2xl transition-all duration-150 group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-200 p-3 shadow-lg ring-4 ring-purple-100">
                  <Calendar className="w-7 h-7 text-purple-700" />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600">Leave Balance</p>
                  <div className="flex items-center mt-2">
                    <span className="text-2xl font-extrabold text-purple-800 mr-2">
                      {totalLeaveBalance} {totalLeaveBalance === 1 ? 'day' : 'days'}
                    </span>
                    <Badge className="ml-1 bg-purple-500 text-white">
                      {totalActiveLeaveTypes} {totalActiveLeaveTypes === 1 ? 'type' : 'types'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalUsedDays} of {totalAllocatedDays} days used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-pink-100 to-red-50 hover:shadow-2xl transition-all duration-150 group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-pink-200 p-3 shadow-lg ring-4 ring-pink-100">
                  <AlertCircle className="w-7 h-7 text-pink-700" />
                </div>
                <div>
                  <p className="text-md font-semibold text-gray-600">Pending Requests</p>
                  <div className="flex items-center mt-2">
                    <span className="text-xl font-extrabold text-pink-800 mr-2">{pendingLeaveRequests}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Leave request(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((recentAttendance || []).slice(0, 4)).map((record, index) => (
                <div key={record.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      record.status === 'present' ? 'bg-green-500' : 
                      record.status === 'holiday' ? 'bg-blue-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">
                      {index === 0 ? 'Today' : new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>
                      {record.check_in_time 
                        ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'
                      } - {record.check_out_time 
                        ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : index === 0 && record.check_in_time ? 'Active' : '-'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((leaveRequests || []).slice(0, 3)).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_types.name} • {request.total_days} day(s)
                    </p>
                  </div>
                  <Badge variant={
                    request.status === 'approved' ? 'default' : 
                    request.status === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Admin/Manager Specific Section - Pending Leave Requests */}
        {(['reporting_manager', 'admin', 'super_admin'].includes(user?.role || '') && ((pendingRequests || []).length > 0)) && (
          <Card className={`${themeClass} card-theme border-0 shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <AlertCircle className="w-5 h-5 mr-2 text-primary" />
                Team Leave Requests Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((pendingRequests || []).slice(0, 3)).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg">
                  <div>
                    <p className="font-medium">{request.employees.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_types.name} • {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} • {request.total_days} day(s)
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="gradient-primary text-white border-0"
                      onClick={() => handleApproveLeave(request.id)}
                      disabled={leaveLoading}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRejectLeave(request.id)}
                      disabled={leaveLoading}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {((pendingRequests || []).length > 3) && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => onNavigate?.('leave-management')}>
                    View All Pending Requests ({(pendingRequests || []).length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Card className={`${themeClass} card-theme bg-white border-0 shadow-lg mb-6 w-full rounded-2xl p-6`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <Button variant="gradient" onClick={() => onNavigate?.('leave')}>Apply for Leave</Button>
            <Button variant="gradient" onClick={() => onNavigate?.('attendance')}>Attendance Calendar</Button>
            <Button variant="gradient" onClick={() => onNavigate?.('reports')}>View Payslip</Button>
          </div>
        </CardContent>
      </Card>
      {(['admin', 'super_admin'].includes(user?.role || '')) && (
        <Card className={`${themeClass} card-theme bg-white border-0 shadow-lg mb-6 w-full rounded-2xl p-6`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Quick Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <Button variant="gradient" onClick={() => onNavigate?.('employees')}><Users className="w-4 h-4 mr-2" />Manage Employees</Button>
              <Button variant="gradient" onClick={() => onNavigate?.('leave-management')}><Calendar className="w-4 h-4 mr-2" />Leave Management</Button>
              <Button variant="gradient" onClick={() => onNavigate?.('reports')}><TrendingUp className="w-4 h-4 mr-2" />View Reports</Button>
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
