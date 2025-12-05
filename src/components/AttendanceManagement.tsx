import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, TrendingUp, Download, CheckCircle, XCircle, CalendarIcon, Circle, HelpCircle, Edit, Crown, Users, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import AttendanceCalendar from './AttendanceCalendar';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import BulkAttendanceImport from './BulkAttendanceImport';

const AttendanceManagement: React.FC = () => {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { user } = useAuth();
  const { todayAttendance, recentAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const { employees, isLoading: isEmployeesLoading, fetchEmployees } = useEmployees();
  const { currentCompany } = useCompany();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Record<string, string>>({});
  const [showBackdateModal, setShowBackdateModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeForm, setStatusChangeForm] = useState({
    employeeId: '',
    employeeName: '',
    currentStatus: '',
    newStatus: '',
    date: '',
    reason: ''
  });
  const [backdateForm, setBackdateForm] = useState({
    employeeId: '',
    date: '',
    type: 'attendance',
    status: '',
  });
  const [submittingBackdate, setSubmittingBackdate] = useState(false);
  const [submittingStatusChange, setSubmittingStatusChange] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateAttendanceMap, setDateAttendanceMap] = useState<Record<string, string>>({});
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeeTab, setEmployeeTab] = useState('today');
  const [backdateRequest, setBackdateRequest] = useState({ date: '', status: '', reason: '' });
  const [submittingBackdateRequest, setSubmittingBackdateRequest] = useState(false);
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location error:', error);
          setLocation(null);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getCurrentLocation();
    const success = await checkIn();
    if (success) {
      toast({
        title: "Check-in Successful",
        description: `Checked in at ${format(new Date(), 'HH:mm')}`,
      });
    } else {
      toast({
        title: "Check-in Failed",
        description: "Unable to check in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    getCurrentLocation();
    const success = await checkOut();
    if (success) {
      toast({
        title: "Check-out Successful",
        description: `Checked out at ${format(new Date(), 'HH:mm')}`,
      });
    } else {
      toast({
        title: "Check-out Failed",
        description: "Unable to check out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    // Use theme variables for color, and a more compact size
    const badgeBase = "flex items-center gap-1 px-2.5 py-0.5 text-sm font-semibold rounded-full shadow-sm border transition-all duration-200 animate-fadein";
    
    switch (status) {
      case 'present':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${badgeBase} bg-green-600 hover:bg-green-700 text-white border-green-700`}
                  aria-label="Present: Employee is present today"
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Present
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Present: Employee is present today</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'absent':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${badgeBase} bg-red-600 hover:bg-red-700 text-white border-red-700`}
                  aria-label="Absent: Employee is absent today"
                >
                  <XCircle className="w-4 h-4 mr-1" /> Leave
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Leave: Employee is on leave today</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'late':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${badgeBase} bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500`}
                  aria-label="Late: Employee checked in late"
                >
                  <Clock className="w-4 h-4 mr-1" /> Late
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Late: Employee checked in late</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'half_day':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${badgeBase} bg-blue-600 hover:bg-blue-700 text-white border-blue-700`}
                  aria-label="Half Day: Employee worked half a day"
                >
                  <Circle className="w-4 h-4 mr-1" /> Half Day
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Half Day: Employee worked half a day</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'holiday':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${badgeBase} bg-purple-600 hover:bg-purple-700 text-white border-purple-700`}
                  aria-label="Holiday: Company holiday"
                >
                  <Crown className="w-4 h-4 mr-1" /> Holiday
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Holiday: Company holiday</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={badgeBase + " bg-muted text-muted-foreground border border-muted/20"}
                  aria-label="Not Marked: Attendance not marked"
                >
                  <Sparkles className="w-4 h-4 mr-1 text-blue-400" /> Not Marked
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Not Marked: Attendance not marked</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  const calculateWorkingHours = (checkIn?: string | null, checkOut?: string | null) => {
    if (!checkIn) return '0h 0m';
    const startTime = new Date(checkIn);
    const endTime = checkOut ? new Date(checkOut) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m';
    const startTime = new Date(todayAttendance.check_in_time);
    const endTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_in_time && todayAttendance?.check_out_time;

  const markAttendanceForEmployee = async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday') => {
    if (!currentCompany) {
      console.error('No company selected');
      toast({ 
        title: 'Error', 
        description: 'No company selected. Please select a company first.', 
        variant: 'destructive' 
      });
      return;
    }

    // Input validation
    if (!employeeId) {
      console.error('No employee ID provided');
      toast({ 
        title: 'Error', 
        description: 'No employee selected', 
        variant: 'destructive' 
      });
      return;
    }

    if (!['present', 'absent', 'late', 'half_day', 'holiday'].includes(status)) {
      console.error('Invalid status:', status);
      toast({ 
        title: 'Error', 
        description: 'Invalid attendance status', 
        variant: 'destructive' 
      });
      return;
    }

    setMarking(employeeId + status);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      // Prepare update object with proper typing
      const updateObj: {
        status: string;
        updated_at: string;
        check_in_time?: string | null;
        check_out_time?: string | null;
      } = { 
        status,
        updated_at: now
      };
      
      // Handle check-in/check-out times based on status
      if (status === 'present' || status === 'late' || status === 'half_day') {
        updateObj.check_in_time = now;
        updateObj.check_out_time = null;
      } else {
        updateObj.check_in_time = null;
        updateObj.check_out_time = null;
      }
      
      // First, check if a record exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', dateStr)
        .single();

      // Handle fetch errors (except "no rows found" which is expected)
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Prepare the data to be saved
      const attendanceData = {
        employee_id: employeeId,
        company_id: currentCompany.id,
        date: dateStr,
        ...updateObj,
      };

      let error;
      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('attendance')
          .update(attendanceData)
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(attendanceData);
        error = insertError;
      }

      if (error) {
        console.error('Attendance operation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        let errorMessage = 'Failed to mark attendance';
        if (error.code === '23503') { // Foreign key violation
          errorMessage = 'Employee not found';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({ 
          title: 'Error', 
          description: errorMessage, 
          variant: 'destructive' 
        });
      } else {
        console.log('Attendance update successful');
        toast({ 
          title: 'Success', 
          description: `Marked as ${status.charAt(0).toUpperCase() + status.slice(1)}` 
        });
        setDateAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
      }
    } catch (e: any) {
      console.error('Unexpected error in markAttendanceForEmployee:', {
        error: e,
        message: e?.message,
        stack: e?.stack
      });
      
      toast({ 
        title: 'Error', 
        description: e?.message || 'An unexpected error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setMarking(null);
    }
  };

  // Fetch today's attendance for all employees (for admin view)
  useEffect(() => {
    const fetchAllTodayAttendance = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !currentCompany) return;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', today)
        .eq('company_id', currentCompany.id);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setTodayAttendanceMap(map);
      }
    };
    fetchAllTodayAttendance();
  }, [user, employees, currentCompany]);

  // Fetch pending approvals (for admins/super admins)
  useEffect(() => {
    const fetchPending = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !currentCompany) return;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('pending_approval', true)
        .eq('company_id', currentCompany.id);
      if (!error && data) setPendingEntries(data);
    };
    fetchPending();
  }, [user, showBackdateModal, currentCompany]);

  // Helper to determine if the current user can approve a request
  const canApproveRequest = (requestorRole) => {
    if (!user) return false;
    if (requestorRole === 'super_admin') return false; // auto-approved
    if (['admin', 'reporting_manager', 'employee'].includes(requestorRole)) {
      if (user.role === 'super_admin') return true;
      if (requestorRole === 'employee' && (user.role === 'admin' || user.role === 'reporting_manager')) return true;
    }
    return false;
  };

  // Auto-approve if requestor is super_admin
  useEffect(() => {
    if (pendingEntries && pendingEntries.length > 0 && user?.role === 'super_admin') {
      pendingEntries.forEach(async (entry) => {
        if (entry.requestor_role === 'super_admin' && entry.pending_approval) {
          await supabase.from('attendance').update({ pending_approval: false }).eq('id', entry.id);
        }
      });
    }
  }, [pendingEntries, user]);

  // Approve/reject handlers
  const handleApprove = async (id: string) => {
    await supabase.from('attendance').update({ pending_approval: false }).eq('id', id);
    setPendingEntries(pendingEntries.filter(e => e.id !== id));
    toast({ title: 'Entry approved' });
  };
  const handleReject = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    setPendingEntries(pendingEntries.filter(e => e.id !== id));
    toast({ title: 'Entry rejected' });
  };

  // Handler for backdated entry
  const handleBackdateSubmit = async () => {
    setSubmittingBackdate(true);
    try {
      if (!backdateForm.employeeId || !backdateForm.date || !backdateForm.status || !currentCompany) return;
      if (backdateForm.type === 'attendance') {
        const { error } = await supabase.from('attendance').upsert({
          employee_id: backdateForm.employeeId,
          company_id: currentCompany.id,
          date: backdateForm.date,
          status: backdateForm.status,
          pending_approval: true,
        }, {
          onConflict: 'employee_id,date'
        });
        
        if (error) {
          console.error('Backdate submission error:', error);
          toast({ title: 'Error', description: 'Failed to submit backdate request', variant: 'destructive' });
          return;
        }
      } else {
        // For leave, you may want to insert into a leave_requests table
        // Placeholder: toast({ title: 'Leave request submitted for approval' });
      }
      toast({ title: 'Submitted for approval' });
      setShowBackdateModal(false);
    } catch (error) {
      console.error('Backdate submission error:', error);
      toast({ title: 'Error', description: 'Unexpected error occurred', variant: 'destructive' });
    } finally {
      setSubmittingBackdate(false);
    }
  };

  useEffect(() => {
    // When opening the modal, set employeeId to self for non-admins
    if (showBackdateModal && user && user.role === 'employee') {
      setBackdateForm(f => ({ ...f, employeeId: user.id }));
    }
  }, [showBackdateModal, user]);

  // Fetch attendance for selected date for all employees
  useEffect(() => {
    const fetchAllAttendance = async () => {
      if (
        !user ||
        (user.role !== 'admin' &&
         user.role !== 'super_admin' &&
         user.role !== 'reporting_manager') ||
        !currentCompany
      ) return;
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .eq('date', dateStr)
        .eq('company_id', currentCompany.id);
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((rec: any) => {
          map[rec.employee_id] = rec.status;
        });
        setDateAttendanceMap(map);
      }
    };
    fetchAllAttendance();
  }, [user, employees, selectedDate, currentCompany]);

  const handleStatusChange = async () => {
    if (!statusChangeForm.employeeId || !statusChangeForm.newStatus || !statusChangeForm.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmittingStatusChange(true);
    try {
      const now = new Date().toISOString();
      let updateObj: any = { 
        status: statusChangeForm.newStatus,
        updated_by: user?.id,
        updated_at: now,
        change_reason: statusChangeForm.reason || 'Status changed by super admin'
      };

      // Handle check-in/check-out times based on new status
      if (statusChangeForm.newStatus === 'present' || statusChangeForm.newStatus === 'late' || statusChangeForm.newStatus === 'half_day') {
        updateObj.check_in_time = now;
        if (statusChangeForm.newStatus === 'present' || statusChangeForm.newStatus === 'late') {
          updateObj.check_out_time = null; // Will be set when they check out
        }
      } else {
        updateObj.check_in_time = null;
        updateObj.check_out_time = null;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: statusChangeForm.employeeId,
          company_id: currentCompany?.id,
          date: statusChangeForm.date,
          ...updateObj,
        }, {
          onConflict: 'employee_id,date'
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to change status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Status changed from ${statusChangeForm.currentStatus} to ${statusChangeForm.newStatus}`,
        });
        setShowStatusChangeModal(false);
        setStatusChangeForm({
          employeeId: '',
          employeeName: '',
          currentStatus: '',
          newStatus: '',
          date: '',
          reason: ''
        });
        // Refresh attendance data
        const fetchAllAttendance = async () => {
          const dateStr = selectedDate.toISOString().split('T')[0];
          const { data, error } = await supabase
            .from('attendance')
            .select('employee_id, status, date')
            .eq('date', dateStr);
          if (!error && data) {
            const map: Record<string, string> = {};
            data.forEach((rec: any) => {
              map[rec.employee_id] = rec.status;
            });
            setDateAttendanceMap(map);
          }
        };
        fetchAllAttendance();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmittingStatusChange(false);
    }
  };

  const openStatusChangeModal = (employeeId: string, employeeName: string, currentStatus: string, date: string) => {
    setStatusChangeForm({
      employeeId,
      employeeName,
      currentStatus,
      newStatus: '',
      date,
      reason: ''
    });
    setShowStatusChangeModal(true);
  };

  // Fetch last 30 days attendance for employee
  useEffect(() => {
    if (user?.role === 'employee' && currentCompany) {
      const fetchEmployeeAttendance = async () => {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 29);
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', user.id)
          .eq('company_id', currentCompany.id)
          .gte('date', fromDate.toISOString().split('T')[0])
          .order('date', { ascending: false });
        if (!error && data) setEmployeeAttendance(data);
      };
      fetchEmployeeAttendance();
    }
  }, [user, todayAttendance, currentCompany]);

  const exportAttendanceReport = async () => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select(`*, employees ( name, email, department, position )`)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false });

      if (error) {
        toast({
          title: "Export Failed",
          description: "Failed to fetch attendance data",
          variant: "destructive"
        });
        return;
      }

      const exportData = attendanceData.map(record => ({
        'Date': record.date,
        'Employee Name': record.employees?.name || 'Unknown',
        'Email': record.employees?.email || 'Unknown',
        'Department': record.employees?.department || 'Unknown',
        'Position': record.employees?.position || 'Unknown',
        'Status': record.status,
        'Check In': record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-',
        'Check Out': record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-',
        'Working Hours': record.check_in_time && record.check_out_time 
          ? calculateWorkingHours(record.check_in_time, record.check_out_time) 
          : '-',
        'Notes': record.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AttendanceReport');
      XLSX.writeFile(wb, `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({
        title: "Export Successful",
        description: "Attendance report has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the report",
        variant: "destructive"
      });
    }
  };

  // Determine which employees to show for attendance management
  let managedEmployees = employees;
  if (user?.role === 'reporting_manager') {
    managedEmployees = employees.filter(emp => emp.reporting_manager_id === user.id);
  }

  return (
    <div className="space-y-8">
      {(!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'reporting_manager')) ? (
        <div className="p-8 text-center text-gray-500">
          Attendance management is only available to admins, super admins, and reporting managers.
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportAttendanceReport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                Bulk Import Attendance
              </Button>
            </div>
          </div>

          {/* Pending Approvals Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
            {pendingEntries.length === 0 ? (
              <div className="text-gray-500">No pending approvals.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Employee</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map((entry) => {
                    const employee = employees.find(e => e.id === entry.employee_id);
                    const canApprove = canApproveRequest(entry.requestor_role);
                    return (
                      <tr key={entry.id} className="hover:bg-blue-50 transition-all duration-150">
                        <td className="px-4 py-2 font-medium text-gray-900">{employee ? employee.name : <span className="italic text-gray-400">Unknown</span>}</td>
                        <td className="px-4 py-2 text-gray-700">{entry.date}</td>
                        <td className="px-4 py-2">{getStatusBadge(entry.status)}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <div className="relative group">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(entry.id)}
                              className="bg-green-600 hover:bg-green-700 text-white shadow rounded-md border border-green-700 focus:ring-2 focus:ring-green-400 focus:outline-none transition"
                              disabled={!canApprove}
                            >
                              Approve
                            </Button>
                            {!canApprove && (
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs bg-gray-800 text-white rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                You do not have permission to approve this request
                              </span>
                            )}
                          </div>
                          <div className="relative group">
                            <Button
                              size="sm"
                              onClick={() => handleReject(entry.id)}
                              className="bg-red-600 hover:bg-red-700 text-white shadow rounded-md border border-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none transition"
                              disabled={!canApprove}
                            >
                              Reject
                            </Button>
                            {!canApprove && (
                              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-max px-2 py-1 text-xs bg-gray-800 text-white rounded shadow opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                You do not have permission to reject this request
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Employee Attendance List Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Employee Attendance</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Date:</span>
                <DatePicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date as Date)}
                  className="rounded-full shadow ring-2 ring-blue-100 animate-pulse"
                />
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Employee</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Mark</th>
                </tr>
              </thead>
              <tbody>
                {managedEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b bg-gradient-to-r from-blue-50 to-green-50">
                    <td className="px-4 py-2">{emp.name}</td>
                    <td className="px-4 py-2">{getStatusBadge(dateAttendanceMap[emp.id])}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white rounded shadow focus:ring-2 focus:ring-green-400"
                        onClick={() => markAttendanceForEmployee(emp.id, 'present')}
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white rounded shadow focus:ring-2 focus:ring-red-400"
                        onClick={() => markAttendanceForEmployee(emp.id, 'absent')}
                      >
                        Leave
                      </Button>
                      <Button
                        size="sm"
                        className="bg-yellow-400 hover:bg-yellow-500 text-white rounded shadow focus:ring-2 focus:ring-yellow-300"
                        onClick={() => markAttendanceForEmployee(emp.id, 'late')}
                      >
                        Late
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow focus:ring-2 focus:ring-blue-400"
                        onClick={() => markAttendanceForEmployee(emp.id, 'half_day')}
                      >
                        Half Day
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded shadow focus:ring-2 focus:ring-purple-400"
                        onClick={() => markAttendanceForEmployee(emp.id, 'holiday')}
                      >
                        Holiday
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Status Change Modal and Backdate Modal can be added here if needed */}
                  </>
                )}
          {/* Bulk Import Attendance Dialog */}
      {currentCompany && (
        <BulkAttendanceImport
          open={showBulkImport}
          setOpen={setShowBulkImport}
          companyId={currentCompany.id}
          onImportComplete={() => {
            // Refresh attendance data if needed
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default AttendanceManagement;
