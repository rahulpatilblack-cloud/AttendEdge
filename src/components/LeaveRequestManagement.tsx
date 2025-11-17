import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  X, 
  AlertTriangle,
  Filter,
  Download,
  FileText,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  RefreshCw,
  Eye,
  Crown,
  UserCheck,
  UserX,
  CalendarDays,
  Clock,
  Building,
  Mail,
  Volume2,
  Smartphone,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface TeamMember {
  id: string;
  name: string;
  department: string;
  email: string;
  pendingRequests: number;
  approvedRequests: number;
  totalLeaveDays: number;
}

interface DepartmentStats {
  department: string;
  totalEmployees: number;
  pendingRequests: number;
  approvedRequests: number;
  totalLeaveDays: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundNotifications: boolean;
  pendingRequestAlerts: boolean;
  approvalReminders: boolean;
  weeklyReports: boolean;
}

const LeaveRequestManagement: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { 
    leaveRequests, 
    pendingRequests, 
    approveLeaveRequest, 
    rejectLeaveRequest, 
    isLoading,
    fetchLeaveRequests,
    leaveBalances,
    fetchLeaveBalances
  } = useLeave('manager');

  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    department: 'all',
    dateRange: { start: '', end: '' },
    search: ''
  });

  // Notification and Settings states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    soundNotifications: true,
    pendingRequestAlerts: true,
    approvalReminders: true,
    weeklyReports: false
  });

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const canManageRequests = ['reporting_manager', 'admin', 'super_admin'].includes(user?.role || '');

  useEffect(() => {
    if (canManageRequests && currentCompany) {
      fetchTeamData();
    }
  }, [canManageRequests, currentCompany]);

  useEffect(() => {
    if (user) {
      fetchLeaveBalances();
    }
  }, [user]);

  // Fetch departments from the departments table
  useEffect(() => {
    if (!currentCompany) return;
    supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .eq('company_id', currentCompany.id)
      .then(({ data }) => setDepartments(data || []));
  }, [currentCompany]);

  const fetchTeamData = async () => {
    if (!currentCompany) return;

    // Fetch team members and their stats for the current company
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, department')
      .eq('company_id', currentCompany.id)
      .eq('is_active', true)
      .order('name');

    if (employees) {
      const teamData = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        email: emp.email,
        pendingRequests: leaveRequests.filter(r => r.employee_id === emp.id && r.status === 'pending').length,
        approvedRequests: leaveRequests.filter(r => r.employee_id === emp.id && r.status === 'approved').length,
        totalLeaveDays: leaveRequests.filter(r => r.employee_id === emp.id && r.status === 'approved').reduce((sum, r) => sum + r.total_days, 0)
      }));
      setTeamMembers(teamData);

      // Calculate department stats
      const deptStats = employees.reduce((acc, emp) => {
        const dept = emp.department;
        if (!acc.find(d => d.department === dept)) {
          acc.push({
            department: dept,
            totalEmployees: employees.filter(e => e.department === dept).length,
            pendingRequests: leaveRequests.filter(r => 
              employees.find(e => e.id === r.employee_id)?.department === dept && r.status === 'pending'
            ).length,
            approvedRequests: leaveRequests.filter(r => 
              employees.find(e => e.id === r.employee_id)?.department === dept && r.status === 'approved'
            ).length,
            totalLeaveDays: leaveRequests.filter(r => 
              employees.find(e => e.id === r.employee_id)?.department === dept && r.status === 'approved'
            ).reduce((sum, r) => sum + r.total_days, 0)
          });
        }
        return acc;
      }, [] as DepartmentStats[]);
      setDepartmentStats(deptStats);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    const commentText = comments[requestId] || '';
    
    // For rejections, require a comment
    if (action === 'reject' && !commentText.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }
    
    let success = false;
    
    if (action === 'approve') {
      success = await approveLeaveRequest(requestId, commentText);
    } else {
      success = await rejectLeaveRequest(requestId, commentText);
    }
    
    if (success) {
      toast({
        title: 'Success',
        description: `Request ${action}d successfully`,
      });
      // Clear the comment and close the input
      setComments(prev => ({ ...prev, [requestId]: '' }));
      setActiveRequest(null);
      
      // Remove from selected requests if it was selected
      if (selectedRequests.includes(requestId)) {
        setSelectedRequests(selectedRequests.filter(id => id !== requestId));
      }
    }
  };
  
  const toggleCommentInput = (requestId: string) => {
    setActiveRequest(activeRequest === requestId ? null : requestId);
  };

  const exportRequests = (format: 'xlsx' | 'csv') => {
    const data = filteredRequests.map(req => ({
      'Company': currentCompany?.name || 'Unknown',
      'Employee': req.employees?.name,
      'Department': req.employees?.department || 'N/A',
      'Leave Type': req.leave_types?.name,
      'Start Date': req.start_date,
      'End Date': req.end_date,
      'Total Days': req.total_days,
      'Status': req.status,
      'Reason': req.reason,
      'Requested On': req.updated_at || 'N/A'
    }));

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'LeaveRequests');
      XLSX.writeFile(wb, `${currentCompany?.name || 'company'}_leave_requests.xlsx`);
    }
  };

  // Enhanced refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing...",
      description: "Updating leave request data",
    });
    
    await fetchLeaveRequests();
    await fetchTeamData();
    
    toast({
      title: "Success",
      description: "Data refreshed successfully",
    });
  };

  // Notification functions
  const handleNotificationSettings = (setting: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    
    toast({
      title: "Settings Updated",
      description: `${setting.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const sendTestNotification = () => {
    toast({
      title: "Test Notification",
      description: "This is a test notification to verify your settings",
    });
  };

  const filteredRequests = leaveRequests.filter(req => {
    let match = true;
    if (filters.status !== 'all') match = match && req.status === filters.status;
    if (filters.leaveType !== 'all') match = match && req.leave_types?.name === filters.leaveType;
    if (filters.department !== 'all') match = match && (req.employees?.department || 'N/A') === filters.department;
    if (filters.dateRange.start) match = match && req.start_date >= filters.dateRange.start;
    if (filters.dateRange.end) match = match && req.end_date <= filters.dateRange.end;
    if (filters.search) match = match && req.employees?.name?.toLowerCase().includes(filters.search.toLowerCase());
    return match;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  // Comment state for each request
  const [comments, setComments] = useState<Record<string, string>>({});
  const [activeRequest, setActiveRequest] = useState<string | null>(null);

  if (!canManageRequests) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
        <p className="text-gray-600">Only managers and administrators can access this section</p>
      </div>
    );
  }

  if (!currentCompany) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
        <p className="text-gray-600">Unable to load company information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Crown className="w-8 h-8 text-purple-600" />
            Team Leave Management
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            Managing leave requests for 
            <span className="font-medium text-blue-600 flex items-center gap-1">
              <Building className="w-4 h-4" />
              {currentCompany.name}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Notifications Dialog */}
          <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Email Notifications</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationSettings('emailNotifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Push Notifications</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationSettings('pushNotifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Sound Notifications</span>
                    </div>
                    <Switch 
                      checked={notificationSettings.soundNotifications}
                      onCheckedChange={(checked) => handleNotificationSettings('soundNotifications', checked)}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Alert Types</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending Request Alerts</span>
                      <Switch 
                        checked={notificationSettings.pendingRequestAlerts}
                        onCheckedChange={(checked) => handleNotificationSettings('pendingRequestAlerts', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Approval Reminders</span>
                      <Switch 
                        checked={notificationSettings.approvalReminders}
                        onCheckedChange={(checked) => handleNotificationSettings('approvalReminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Weekly Reports</span>
                      <Switch 
                        checked={notificationSettings.weeklyReports}
                        onCheckedChange={(checked) => handleNotificationSettings('weeklyReports', checked)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={sendTestNotification} className="flex-1">
                    Send Test Notification
                  </Button>
                  <Button variant="outline" onClick={() => setShowNotifications(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Settings Dialog */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Leave Management Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto-refresh every 5 minutes</span>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Show employee photos</span>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enable bulk actions</span>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Export with timestamps</span>
                    <Switch />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Display Options</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show department filters</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show date range picker</span>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show request counts</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={() => setShowSettings(false)} className="flex-1">
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Manager Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-600">{pendingRequests.length}</p>
                <p className="text-xs text-gray-500">Requires attention</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-green-600">{teamMembers.length}</p>
                <p className="text-xs text-gray-500">Total employees</p>
              </div>
              <Users className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved This Month</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leaveRequests.filter(r => r.status === 'approved' && 
                    new Date(r.approved_at || '').getMonth() === new Date().getMonth()).length}
                </p>
                <p className="text-xs text-gray-500">Current month</p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leave Days</p>
                <p className="text-2xl font-bold text-purple-600">
                  {leaveRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.total_days, 0)}
                </p>
                <p className="text-xs text-gray-500">Approved leave</p>
              </div>
              <CalendarDays className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="team">Team Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Urgent Pending Requests ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <p className="font-medium">{request.employees?.name}</p>
                          <p className="text-sm text-gray-600">
                            {request.leave_types?.name} • {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
                          </p>
                          <p className="text-xs text-gray-500">{request.reason}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="gradient" 
                              onClick={() => handleRequestAction(request.id, 'approve')}
                              disabled={activeRequest === request.id && !comments[request.id]?.trim()}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="gradient" 
                              onClick={() => handleRequestAction(request.id, 'reject')}
                              disabled={activeRequest === request.id && !comments[request.id]?.trim()}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => toggleCommentInput(request.id)}
                              className="text-xs"
                            >
                              {activeRequest === request.id ? 'Hide Comment' : 'Add Comment'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {activeRequest === request.id && (
                        <div className="ml-4 mb-2">
                          <Textarea
                            placeholder={comments[request.id] ? 'Update your comment...' : 'Add a comment (required for rejection)...'}
                            value={comments[request.id] || ''}
                            onChange={(e) => 
                              setComments(prev => ({ ...prev, [request.id]: e.target.value }))
                            }
                            className="w-full"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {pendingRequests.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-gray-500">No pending requests</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-500" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-gray-600">{teamMembers.filter(m => m.department === dept.name).length} employees</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">{teamMembers.filter(m => m.department === dept.name).filter(m => m.pendingRequests > 0).length} pending</p>
                        <p className="text-xs text-gray-500">{teamMembers.filter(m => m.department === dept.name).reduce((sum, m) => sum + m.totalLeaveDays, 0)} days taken</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* My Leave Balances Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Leave Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leaveBalances && leaveBalances.length > 0 ? (
                  leaveBalances.filter(balance => balance.leave_types && balance.leave_types.name && balance.allocated_days > 0).map(balance => {
                    const used = balance.used_days || 0;
                    const remaining = (balance.allocated_days || 0) - used;
                    return (
                      <div key={balance.leave_type_id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{balance.leave_types.name}</p>
                            <p className="text-sm text-gray-600">
                              {used} of {balance.allocated_days} days used
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {remaining}
                            </p>
                            <p className="text-xs text-gray-500">Remaining</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(used / (balance.allocated_days || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500">No leave balances found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* Advanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={filters.dateRange.start} onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, start: e.target.value}})} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={filters.dateRange.end} onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})} />
                </div>
                <div>
                  <Label>Search Employee</Label>
                  <Input placeholder="Search by name..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => setFilters({status: 'all', leaveType: 'all', department: 'all', dateRange: {start: '', end: ''}, search: ''})}>
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">{selectedRequests.length} requests selected for bulk action</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleBulkAction('approve')}>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Approve All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')}>
                      <UserX className="w-4 h-4 mr-1" />
                      Reject All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRequests([])}>
                      <X className="w-4 h-4 mr-1" />
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Team Leave Requests ({filteredRequests.length})
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportRequests('xlsx')}>
                    <Download className="w-4 h-4 mr-1" />
                    Export Excel
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">
                        <Checkbox 
                          checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRequests(filteredRequests.map(r => r.id));
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-3 font-medium">Employee</th>
                      <th className="text-left p-3 font-medium">Department</th>
                      <th className="text-left p-3 font-medium">Leave Type</th>
                      <th className="text-left p-3 font-medium">Dates</th>
                      <th className="text-left p-3 font-medium">Days</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Checkbox 
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRequests([...selectedRequests, request.id]);
                              } else {
                                setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 font-medium">{request.employees?.name}</td>
                        <td className="p-3 text-gray-600">{request.employees?.department || 'N/A'}</td>
                        <td className="p-3">{request.leave_types?.name}</td>
                        <td className="p-3">
                          {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
                        </td>
                        <td className="p-3">{request.total_days}</td>
                        <td className="p-3">
                          <Badge variant={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {request.status === 'pending' && (
                              <>
                                <Button size="sm" variant="gradient" onClick={() => handleSingleAction(request.id, 'approve')}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="gradient" onClick={() => handleSingleAction(request.id, 'reject')}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Overview Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.department}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2">
                          <Badge variant="secondary">{member.pendingRequests} pending</Badge>
                          <Badge variant="default">{member.approvedRequests} approved</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{member.totalLeaveDays} days taken</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Department Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map((dept) => (
                    <div key={dept.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{dept.name}</span>
                        <span className="text-sm text-gray-600">{teamMembers.filter(m => m.department === dept.name).length} employees</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="font-medium text-orange-600">{teamMembers.filter(m => m.department === dept.name).filter(m => m.pendingRequests > 0).length}</p>
                          <p className="text-gray-500">Pending</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-green-600">{teamMembers.filter(m => m.department === dept.name).filter(m => m.approvedRequests > 0).length}</p>
                          <p className="text-gray-500">Approved</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-blue-600">{teamMembers.filter(m => m.department === dept.name).reduce((sum, m) => sum + m.totalLeaveDays, 0)}</p>
                          <p className="text-gray-500">Days</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Leave Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Approved Requests</span>
                    <span className="font-bold text-green-600">
                      {leaveRequests.filter(r => r.status === 'approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span>Pending Requests</span>
                    <span className="font-bold text-orange-600">
                      {leaveRequests.filter(r => r.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span>Rejected Requests</span>
                    <span className="font-bold text-red-600">
                      {leaveRequests.filter(r => r.status === 'rejected').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center gap-3 p-2">
                      <div className={`w-2 h-2 rounded-full ${
                        request.status === 'approved' ? 'bg-green-500' :
                        request.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.employees?.name}</p>
                        <p className="text-xs text-gray-500">
                          {request.leave_types?.name} • {format(new Date(request.updated_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(request.status)} className="text-xs">
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default LeaveRequestManagement;