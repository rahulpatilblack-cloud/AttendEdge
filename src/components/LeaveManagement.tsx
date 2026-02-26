import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeave } from '@/hooks/useLeave';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Plus, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Send, 
  X, 
  Crown, 
  CalendarIcon,
  Users,
  TrendingUp,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Eye,
  BarChart3,
  Bell,
  Settings,
  RefreshCw,
  FileText,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  CalendarDays,
  Building,
  Mail,
  Volume2,
  Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import LeaveCalendar from './LeaveCalendar';
import { useCompany } from '@/contexts/CompanyContext';
import BackdatedLeave from './BackdatedLeave';

interface LeaveType {
  id: string;
  name: string;
  max_days_per_year: number;
  is_active?: boolean;
  company_id?: string; // Add this line
}

interface TeamMember {
  id: string;
  name: string;
  department: string;
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

// --- Leave Type Management Card/Palette UI ---
const LeaveTypeCard = ({ leaveType, onEdit, onToggleActive }) => (
  <div className={`relative card-theme rounded-2xl p-6 flex flex-col min-h-[120px] shadow-md border ${leaveType.is_active ? '' : 'opacity-60 grayscale'}`}
    style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}>
    <div className="flex items-center justify-between mb-2">
      <span className="font-bold text-lg text-primary">{leaveType.name}</span>
      <div className="flex gap-2 items-center">
        <button title="Edit" className="text-blue-500 hover:underline text-xs mr-2" onClick={() => onEdit(leaveType)}>✏️</button>
        <Switch checked={leaveType.is_active} onCheckedChange={() => onToggleActive(leaveType)} />
      </div>
    </div>
    <div className="text-xs text-gray-600 mb-1">{leaveType.description || 'No description'}</div>
    <div className="text-xs text-gray-600">Quota: <span className="font-semibold">{leaveType.max_days_per_year}</span> days/year</div>
    {!leaveType.is_active && <div className="absolute top-2 right-2 text-xs text-red-500">Inactive</div>}
  </div>
);

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { 
    leaveRequests, 
    leaveBalances, 
    pendingRequests, 
    approveLeaveRequest, 
    rejectLeaveRequest, 
    isLoading,
    fetchLeaveRequests 
  } = useLeave('employee');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Enhanced manager state
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [managerView, setManagerView] = useState('overview');
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
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

  // Leave Type Management states
  const [allLeaveTypes, setAllLeaveTypes] = useState<any[]>([]);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<any>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    description: '',
    max_days_per_year: 0,
    is_active: true
  });

  const { currentCompany } = useCompany();

  const canApproveRequests = ['reporting_manager', 'admin', 'super_admin'].includes(user?.role || '');
  const canManageLeaveTypes = ['admin', 'super_admin'].includes(user?.role || '');

  // Fetch all leave types for management
  useEffect(() => {
    if (canManageLeaveTypes && currentCompany?.id) {
      fetchAllLeaveTypes();
    }
  }, [canManageLeaveTypes, currentCompany]);

  const fetchAllLeaveTypes = async () => {
    if (!currentCompany?.id) return;
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('name');
    
    if (!error && data) {
      setAllLeaveTypes(data);
    }
  };

  const handleAddLeaveType = () => {
    setEditingLeaveType(null);
    setLeaveTypeForm({
      name: '',
      description: '',
      max_days_per_year: 0,
      is_active: true
    });
    setShowLeaveTypeModal(true);
  };

  const handleEditLeaveType = (leaveType: any) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeForm({
      name: leaveType.name,
      description: leaveType.description || '',
      max_days_per_year: leaveType.max_days_per_year,
      is_active: leaveType.is_active !== false
    });
    setShowLeaveTypeModal(true);
  };

  const handleSaveLeaveType = async () => {
    if (!leaveTypeForm.name || leaveTypeForm.max_days_per_year <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (!currentCompany?.id) {
      toast({
        title: "Error",
        description: "No company selected.",
        variant: "destructive",
      });
      return;
    }
    const { error } = editingLeaveType 
      ? await supabase
          .from('leave_types')
          .update({ ...leaveTypeForm, company_id: currentCompany.id })
          .eq('id', editingLeaveType.id)
      : await supabase
          .from('leave_types')
          .insert({ ...leaveTypeForm, company_id: currentCompany.id });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save leave type",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Leave type ${editingLeaveType ? 'updated' : 'created'} successfully`,
      });
      setShowLeaveTypeModal(false);
      fetchAllLeaveTypes();
    }
  };

  const handleToggleLeaveTypeActive = async (leaveType: any) => {
    const { error } = await supabase
      .from('leave_types')
      .update({ is_active: !leaveType.is_active })
      .eq('id', leaveType.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update leave type status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Leave type ${leaveType.is_active ? 'deactivated' : 'activated'}`,
      });
      fetchAllLeaveTypes();
    }
  };

  // If not a manager, show employee view
  if (!canApproveRequests) {
    return <EmployeeLeaveView />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleApprove = async (requestId: string) => {
    await approveLeaveRequest(requestId);
    toast({
      title: "Approved",
      description: "Leave request has been approved.",
    });
  };

  const handleReject = async (requestId: string) => {
    await rejectLeaveRequest(requestId);
    toast({
      title: "Rejected",
      description: "Leave request has been rejected.",
    });
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    for (const requestId of selectedRequests) {
      if (action === 'approve') {
        await approveLeaveRequest(requestId);
      } else {
        await rejectLeaveRequest(requestId);
      }
    }
    setSelectedRequests([]);
    toast({
      title: "Success",
      description: `Bulk ${action} completed for ${selectedRequests.length} requests`,
    });
  };

  // Enhanced refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing...",
      description: "Updating leave request data",
    });
    
    await fetchLeaveRequests();
    
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

  // Manager/Admin Enhanced View
  return (
    <div className="space-y-4">
      {/* Admin/Super Admin Leave Type Management Section */}
      {canManageLeaveTypes && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Leave Types</h2>
              <p className="text-gray-600 mt-1">Configure leave types and their quotas</p>
            </div>
            <Button onClick={handleAddLeaveType} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Leave Type
            </Button>
          </div>

          {/* Leave Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allLeaveTypes.map((leaveType) => (
              <LeaveTypeCard
                key={leaveType.id}
                leaveType={leaveType}
                onEdit={handleEditLeaveType}
                onToggleActive={handleToggleLeaveTypeActive}
              />
            ))}
          </div>

          {/* Add/Edit Leave Type Modal */}
          <Dialog open={showLeaveTypeModal} onOpenChange={setShowLeaveTypeModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLeaveType ? 'Edit Leave Type' : 'Add New Leave Type'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Leave Type Name *</Label>
                  <Input
                    id="name"
                    value={leaveTypeForm.name}
                    onChange={(e) => setLeaveTypeForm({...leaveTypeForm, name: e.target.value})}
                    placeholder="e.g., Sick Leave, Casual Leave"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={leaveTypeForm.description}
                    onChange={(e) => setLeaveTypeForm({...leaveTypeForm, description: e.target.value})}
                    placeholder="Brief description of this leave type"
                  />
                </div>
                <div>
                  <Label htmlFor="quota">Days Per Year *</Label>
                  <Input
                    id="quota"
                    type="number"
                    min="1"
                    value={leaveTypeForm.max_days_per_year}
                    onChange={(e) => setLeaveTypeForm({...leaveTypeForm, max_days_per_year: parseInt(e.target.value) || 0})}
                    placeholder="e.g., 12"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={leaveTypeForm.is_active}
                    onCheckedChange={(checked) => setLeaveTypeForm({...leaveTypeForm, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveLeaveType} className="flex-1">
                    {editingLeaveType ? 'Update' : 'Create'} Leave Type
                  </Button>
                  <Button variant="gradient" onClick={() => setShowLeaveTypeModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage and approve leave requests from your team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {/* Notifications Dialog */}
          <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
            <DialogTrigger asChild>
              <Button variant="gradient">
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
              <div className="space-y-3">
                <div className="space-y-2">
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
                
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">Alert Types</h4>
                  <div className="space-y-2">
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
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button onClick={sendTestNotification} className="flex-1">
                    Send Test Notification
                  </Button>
                  <Button variant="gradient" onClick={() => setShowNotifications(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Settings Dialog */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="gradient">
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
              <div className="space-y-3">
                <div className="space-y-2">
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
                
                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">Display Options</h4>
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
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button onClick={() => setShowSettings(false)} className="flex-1">
                    Save Settings
                  </Button>
                  <Button variant="gradient" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-xl font-bold text-blue-600">{pendingRequests.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-xl font-bold text-green-600">{leaveRequests.length}</p>
              </div>
              <Users className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved This Month</p>
                <p className="text-xl font-bold text-purple-600">
                  {leaveRequests.filter(r => r.status === 'approved' && 
                    new Date(r.approved_at || '').getMonth() === new Date().getMonth()).length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leave Days</p>
                <p className="text-xl font-bold text-orange-600">
                  {leaveRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.total_days, 0)}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={managerView} onValueChange={setManagerView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="backdated">Backdated Leave</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Pending Requests ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium">{request.employees.name}</p>
                        <p className="text-sm text-gray-600">
                          {request.leave_types.name} • {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(request.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="gradient" onClick={() => handleReject(request.id)}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingRequests.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No pending requests</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaveRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">{request.employees.name}</p>
                        <p className="text-sm text-gray-600">{request.leave_types.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{request.status === 'pending' ? 'Pending' : 'Approved'}</p>
                        <p className="text-xs text-gray-500">{request.total_days} days</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* Enhanced Filters for Managers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <Label>Leave Type</Label>
                  <Select value={filters.leaveType} onValueChange={(value) => setFilters({...filters, leaveType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {leaveTypes.map(type => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search Employee</Label>
                  <Input 
                    placeholder="Search by name..." 
                    value={filters.search} 
                    onChange={(e) => setFilters({...filters, search: e.target.value})} 
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="gradient" onClick={() => setFilters({status: 'all', leaveType: 'all', search: ''})}>
                    Clear Filters
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
                    <span className="font-medium">{selectedRequests.length} requests selected</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleBulkAction('approve')}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve All
                    </Button>
                    <Button size="sm" variant="gradient" onClick={() => handleBulkAction('reject')}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject All
                    </Button>
                    <Button size="sm" variant="gradient" onClick={() => setSelectedRequests([])}>
                      <X className="w-4 h-4 mr-1" />
                      Clear
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
                  Leave Requests ({leaveRequests.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">
                        <Checkbox 
                          checked={selectedRequests.length === leaveRequests.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRequests(leaveRequests.map(r => r.id));
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-2">Employee</th>
                      <th className="text-left p-2">Leave Type</th>
                      <th className="text-left p-2">Dates</th>
                      <th className="text-left p-2">Days</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
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
                        <td className="p-2 font-medium">{request.employees.name}</td>
                        <td className="p-2">{request.leave_types.name}</td>
                        <td className="p-2">
                          {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
                        </td>
                        <td className="p-2">{request.total_days}</td>
                        <td className="p-2">
                          <Badge variant={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {request.status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(request.id)}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="gradient" onClick={() => handleReject(request.id)}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="gradient">
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

          {/* My Leave Balances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Leave Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leaveTypes.filter(type => type.is_active).map(type => {
                  const used = leaveRequests
                    .filter(req => req.leave_type_id === type.id && ['approved', 'pending'].includes(req.status))
                    .reduce((sum, req) => sum + (req.total_days || 0), 0);
                  const remaining = type.max_days_per_year - used;
                  return (
                    <div key={type.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-xs text-gray-500">Company: {type.company_id}</p>
                          <p className="text-sm text-gray-600">
                            {used} of {type.max_days_per_year} days used
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
                            style={{ width: `${(used / type.max_days_per_year) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {leaveTypes.filter(type => type.is_active).length === 0 && (
                  <p className="text-gray-500">No leave balances found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Calendar Tab */}
        <TabsContent value="calendar">
          <LeaveCalendar />
        </TabsContent>

        {/* Backdated Leave Tab */}
        <TabsContent value="backdated">
          <BackdatedLeave />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Employee View Component
const EmployeeLeaveView: React.FC = () => {
  const { user } = useAuth();
  const { 
    leaveRequests, 
    leaveBalances, 
    pendingRequests, 
    isLoading,
    fetchLeaveRequests 
  } = useLeave('employee'); // Explicitly use employee mode to get only own requests
  const { recentAttendance } = useAttendance();
  const { currentCompany } = useCompany();

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, [currentCompany]);

  const fetchLeaveTypes = async () => {
    if (!currentCompany) return;
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('company_id', currentCompany.id);
    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason || !currentCompany) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: user?.id,
      company_id: currentCompany.id,
          leave_type_id: formData.leaveTypeId,
          start_date: formData.startDate,
          end_date: formData.endDate,
          total_days: totalDays,
          reason: formData.reason,
      status: user?.role === 'super_admin' ? 'approved' : 'pending'
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit leave request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setShowRequestForm(false);
      fetchLeaveRequests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const myRequests = leaveRequests.filter(req => req.employee_id === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Leave & Attendance</h1>
          <p className="text-gray-600 mt-1">Manage your leave requests and view attendance history</p>
        </div>
        <Button 
          onClick={() => setShowRequestForm(!showRequestForm)}
          variant="gradient"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showRequestForm ? 'Cancel' : 'Request Leave'}
        </Button>
      </div>

      {/* Leave Request Form */}
          {showRequestForm && (
        <Card>
              <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
              </CardHeader>
              <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select value={formData.leaveTypeId} onValueChange={(value) => setFormData({...formData, leaveTypeId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                      {leaveTypes.filter(type => type.is_active).map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                  <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                  <Label htmlFor="endDate">End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    min={formData.startDate}
                      />
                    </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="Enter reason for leave"
                      />
                    </div>
                  </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">
                  💡 You can submit leave requests for past dates if you forgot to request them earlier.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gradient-primary text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </Button>
                <Button type="button" variant="gradient" onClick={() => setShowRequestForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="backdated">Backdated Leave</TabsTrigger>
        </TabsList>

        {/* Leave Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* My Leave Balances */}
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Leave Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leaveTypes.filter(type => type.is_active).map(type => {
                  const used = leaveRequests
                    .filter(req => req.leave_type_id === type.id && ['approved', 'pending'].includes(req.status))
                    .reduce((sum, req) => sum + (req.total_days || 0), 0);
                  const remaining = type.max_days_per_year - used;
                  return (
                    <div key={type.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-xs text-gray-500">Company: {type.company_id}</p>
                          <p className="text-sm text-gray-600">
                            {used} of {type.max_days_per_year} days used
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
                            style={{ width: `${(used / type.max_days_per_year) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {leaveTypes.filter(type => type.is_active).length === 0 && (
                  <p className="text-gray-500">No leave balances found.</p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* My Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Leave History ({myRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRequests.length > 0 ? (
                  myRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{request.leave_types?.name}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')} ({request.total_days} days)
                        </p>
                        <p className="text-xs text-gray-500">{request.reason}</p>
                        </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="gradient"
                            onClick={async () => {
                              await supabase.from('leave_requests').delete().eq('id', request.id);
                              toast({ title: 'Cancelled', description: 'Leave request cancelled.' });
                              fetchLeaveRequests();
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No leave requests yet</p>
                    <p className="text-sm text-gray-400">Submit your first leave request above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                My Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent>
          <LeaveCalendar />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          {/* Attendance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {recentAttendance.filter(a => a.status === 'present').length}
                  </p>
                  <p className="text-sm text-gray-600">Present Days</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {recentAttendance.filter(a => a.status === 'absent').length}
                  </p>
                  <p className="text-sm text-gray-600">Leave Days</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {recentAttendance.filter(a => a.status === 'late').length}
                  </p>
                  <p className="text-sm text-gray-600">Late Days</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {recentAttendance.filter(a => a.status === 'holiday').length}
                  </p>
                  <p className="text-sm text-gray-600">Holidays</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Attendance History (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAttendance.length > 0 ? (
                  recentAttendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{format(new Date(record.date), 'EEEE, MMMM dd, yyyy')}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          {record.check_in_time && (
                            <span>In: {format(new Date(record.check_in_time), 'HH:mm')}</span>
                          )}
                          {record.check_out_time && (
                            <span>Out: {format(new Date(record.check_out_time), 'HH:mm')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          record.status === 'present' ? 'default' :
                          record.status === 'absent' ? 'destructive' :
                          record.status === 'late' ? 'secondary' : 'outline'
                        }>
                          {record.status}
                        </Badge>
                        {record.notes && (
                          <p className="text-xs text-gray-500">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No attendance records found</p>
                    <p className="text-sm text-gray-400">Your attendance history will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backdated Leave Tab */}
        <TabsContent value="backdated">
          <BackdatedLeave />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { EmployeeLeaveView };

export default LeaveManagement;
