import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCheck,
  BarChart3,
  Bell,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useProjectLeave } from '@/hooks/useProjectLeave'; // Added import
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface DashboardGridProps {
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ 
  onNavigate, 
  onRefresh, 
  isLoading 
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { todayAttendance, recentAttendance } = useAttendance();
  const { leaveRequests, leaveBalances, pendingRequests } = useLeave('employee');
  
  // Added project leave hook
  const { pendingProjectLeaveRequests, projectLeaveBalances, isLoading: isProjectLeaveLoading } = useProjectLeave();

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    if (!recentAttendance) return { present: 0, absent: 0, late: 0, total: 0 };
    
    const stats = recentAttendance.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, {} as any);

    return {
      present: stats.present || 0,
      absent: stats.absent || 0,
      late: stats.late || 0,
      total: stats.total || 0
    };
  };

  const attendanceStats = getAttendanceStats();

  // Get today's status
  const getTodayStatus = () => {
    if (!todayAttendance) return { status: 'Not Checked In', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' };
    
    if (todayAttendance.check_out_time) {
      return { status: 'Checked Out', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
    }
    if (todayAttendance.check_in_time) {
      return { status: 'Checked In', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50' };
    }
    return { status: 'Not Checked In', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' };
  };

  const todayStatus = getTodayStatus();
  const StatusIcon = todayStatus.icon;

  return (
    <div className="space-y-6">
      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Status Card */}
        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Today's Status</p>
                <div className="flex items-center mt-2">
                  <StatusIcon className={`w-5 h-5 ${todayStatus.color} mr-2`} />
                  <span className="font-semibold text-gray-800">{todayStatus.status}</span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${todayStatus.bg}`}>
                <StatusIcon className={`w-6 h-6 ${todayStatus.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* REPLACED: Project Leave Balance Card */}
        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Project Leave Balance</p>
                <p className="text-2xl font-bold text-green-800 mt-1">
                  {projectLeaveBalances}
                </p>
                <p className="text-xs text-green-600">days remaining</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <Calendar className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* REPLACED: Pending Project Requests Card */}
        <Card 
          className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer"
          onClick={() => onNavigate('manage-project-leave')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Pending Project Requests</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">
                  {pendingProjectLeaveRequests.length}
                </p>
                <p className="text-xs text-purple-600">awaiting approval</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <Bell className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate Card */}
        <Card className="hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Attendance Rate</p>
                <p className="text-2xl font-bold text-orange-800 mt-1">
                  {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-orange-600">this month</p>
              </div>
              <div className="p-3 rounded-full bg-orange-200">
                <TrendingUp className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  onClick={() => onNavigate('attendance')}
                >
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-xs">Attendance</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 transition-all"
                  onClick={() => onNavigate('leave')}
                >
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="text-xs">Request Leave</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-300 transition-all"
                  onClick={() => onNavigate('reports')}
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">Reports</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-all"
                  onClick={() => onNavigate('teams')}
                >
                  <Users className="w-5 h-5 text-orange-600" />
                  <span className="text-xs">Teams</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAttendance?.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        record.status === 'present' ? 'bg-green-500' :
                        record.status === 'absent' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    {record.check_in_time && (
                      <span className="text-sm text-gray-500">
                        {new Date(record.check_in_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                ))}
                {(!recentAttendance || recentAttendance.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notifications & Quick Stats */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests && pendingRequests.length > 0 ? (
                  pendingRequests.slice(0, 3).map((request, index) => (
                    <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                      <p className="text-sm font-medium text-orange-800">
                        Leave Request Pending
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {request.leave_type} - {new Date(request.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Present Days</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {attendanceStats.present}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Leave Days</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {attendanceStats.absent}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Late Days</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {attendanceStats.late}
                  </Badge>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">Total Days</span>
                    <span className="text-lg font-bold text-blue-600">
                      {attendanceStats.total}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refresh Button */}
          <Button 
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};