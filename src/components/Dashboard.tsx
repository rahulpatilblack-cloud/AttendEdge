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
  FileText,
  FileSpreadsheet,
  CalendarPlus,
  BarChart3
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
    <div className="min-h-screen w-full gradient-page">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Welcome Header with Glassmorphism */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {/* Welcome Header content START */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-page-title mb-1">Welcome back, {user?.name}</div>
                {currentCompany && (
                  <div className="text-body font-medium mb-1">{currentCompany.name}</div>
                )}
                <div className="text-4xl font-extrabold text-blue-700 mb-1 flex items-center gap-2">
                  <Clock className="icon-card text-blue-400 bg-white rounded-full p-1 shadow mr-2" />
                  {currentTime}
                </div>
                <div className="text-muted mb-1 text-lg">{currentDate}</div>
                <div className="text-purple-700 font-semibold text-md">{user?.position}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <SessionStatusIndicator />
                <Button 
                  variant="gradient" 
                  size="sm" 
                  onClick={refreshDashboardData}
                  disabled={attendanceLoading || leaveLoading}
                  className="interactive flex items-center gap-2"
                >
                  <TrendingUp className="icon-inline" />
                  Refresh
                </Button>
                <Button variant="gradient" className="interactive" onClick={handleCheckInOut}>
                  {todayAttendance?.check_in_time && !todayAttendance?.check_out_time ? 'Check Out' : 'Check In'}
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

        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
              <Button variant="gradient" onClick={() => onNavigate?.('manage-projects')}>
                <Briefcase className="w-4 h-4 mr-2" />
                Project Directory
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('project-team-management')}>
                <Users className="w-4 h-4 mr-2" />
                Consultant Directory
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('project-allocations')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Project Leave Allocations
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('mark-project-leave-hours')}>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Project Leave Entry
              </Button>
              <Button variant="gradient" onClick={() => onNavigate?.('leave-report-hr')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Leave Report (hr)
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
