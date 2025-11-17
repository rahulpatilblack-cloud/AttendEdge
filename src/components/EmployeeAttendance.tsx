import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, MapPin, CalendarIcon, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import AttendanceCalendar from './AttendanceCalendar';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

const EmployeeAttendance: React.FC = () => {
  const { user } = useAuth();
  const { todayAttendance, checkIn, checkOut, isLoading } = useAttendance();
  const { currentCompany } = useCompany();
  const [employeeTab, setEmployeeTab] = useState('today');
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [backdateForm, setBackdateForm] = useState({ date: '', status: '', reason: '' });
  const [submittingBackdate, setSubmittingBackdate] = useState(false);

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
          setLocation(null);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getCurrentLocation();
    const success = await checkIn();
    if (success) {
      toast({ title: 'Check-in Successful', description: `Checked in at ${format(new Date(), 'HH:mm')}` });
    } else {
      toast({ title: 'Check-in Failed', description: 'Unable to check in. Please try again.', variant: 'destructive' });
    }
  };

  const handleCheckOut = async () => {
    getCurrentLocation();
    const success = await checkOut();
    if (success) {
      toast({ title: 'Check-out Successful', description: `Checked out at ${format(new Date(), 'HH:mm')}` });
    } else {
      toast({ title: 'Check-out Failed', description: 'Unable to check out. Please try again.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'present':
        return <span className="bg-green-500 text-white px-2 py-1 rounded">Present</span>;
      case 'absent':
        return <span className="bg-red-500 text-white px-2 py-1 rounded">Leave</span>;
      case 'late':
        return <span className="bg-yellow-500 text-white px-2 py-1 rounded">Late</span>;
      case 'half_day':
        return <span className="bg-blue-500 text-white px-2 py-1 rounded">Half Day</span>;
      default:
        return <span className="bg-gray-400 text-white px-2 py-1 rounded">Not Marked</span>;
    }
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

  const handleBackdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backdateForm.date || backdateForm.status === 'select') {
      toast({ title: 'Error', description: 'Please select a date and status', variant: 'destructive' });
      return;
    }
    setSubmittingBackdate(true);
    try {
      const { error } = await supabase.from('attendance').upsert({
        employee_id: user.id,
        company_id: currentCompany.id,
        date: backdateForm.date,
        status: backdateForm.status,
        notes: backdateForm.reason,
        pending_approval: true,
        requestor_role: user.role,
      }, {
        onConflict: 'employee_id,date'
      });
      
      if (error) {
        console.error('Backdate submission error:', error);
        toast({ title: 'Error', description: 'Failed to submit backdate request', variant: 'destructive' });
        return;
      }
      toast({ title: 'Request Submitted', description: 'Backdate attendance request sent for approval.' });
      setBackdateForm({ date: '', status: '', reason: '' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit request', variant: 'destructive' });
    } finally {
      setSubmittingBackdate(false);
    }
  };

  useEffect(() => {
    if (user && currentCompany) {
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Attendance</h1>
      </div>
      <Tabs value={employeeTab} onValueChange={setEmployeeTab} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="backdate">Backdate</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          {/* Today Tab Content */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Your Attendance</h2>
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2 text-blue-800">
                  <Clock className="w-6 h-6" />
                  <span>Quick Attendance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  {!todayAttendance?.check_in_time ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">Not checked in today</p>
                    </div>
                  ) : isCheckedIn ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-green-600 font-semibold">Checked In</p>
                      <p className="text-sm text-gray-600">
                        Since {format(new Date(todayAttendance.check_in_time), 'HH:mm')}
                      </p>
                      <p className="text-sm font-medium">Working: {getWorkingHours()}</p>
                    </div>
                  ) : isCheckedOut ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-blue-600 font-semibold">Day Completed</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(todayAttendance.check_in_time), 'HH:mm')} - {format(new Date(todayAttendance.check_out_time), 'HH:mm')}
                      </p>
                      <p className="text-sm font-medium">Total: {getWorkingHours()}</p>
                    </div>
                  ) : null}
                </div>
                <div className="text-center">
                  {!todayAttendance?.check_in_time ? (
                    <Button
                      onClick={handleCheckIn}
                      disabled={isLoading}
                      variant="gradient"
                      className="w-full"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Check In
                    </Button>
                  ) : isCheckedIn ? (
                    <Button
                      onClick={handleCheckOut}
                      disabled={isLoading}
                      variant="gradient"
                      className="w-full"
                      size="lg"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Check Out
                    </Button>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 text-sm">You have completed your day</p>
                    </div>
                  )}
                </div>
                {location && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span>Location recorded</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
                 <TabsContent value="calendar">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <CalendarIcon className="w-5 h-5" />
                 Attendance Calendar (Last 30 Days)
               </CardTitle>
             </CardHeader>
             <CardContent className="flex justify-center">
               <div className="max-w-4xl">
                 <AttendanceCalendar />
               </div>
             </CardContent>
           </Card>
         </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Attendance History (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Check In</th>
                      <th className="px-4 py-2 text-left">Check Out</th>
                      <th className="px-4 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAttendance.map((rec) => (
                      <tr key={rec.date} className="border-b">
                        <td className="px-4 py-2">{format(new Date(rec.date), 'MMM dd, yyyy')}</td>
                        <td className="px-4 py-2">{getStatusBadge(rec.status)}</td>
                        <td className="px-4 py-2">{rec.check_in_time ? format(new Date(rec.check_in_time), 'HH:mm') : '-'}</td>
                        <td className="px-4 py-2">{rec.check_out_time ? format(new Date(rec.check_out_time), 'HH:mm') : '-'}</td>
                        <td className="px-4 py-2">{rec.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="backdate">
          <div className="p-4">
            <form className="max-w-md mx-auto space-y-4" onSubmit={handleBackdateSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={backdateForm.date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setBackdateForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={backdateForm.status}
                  onChange={e => setBackdateForm(f => ({ ...f, status: e.target.value }))}
                  required
                >
                  <option value="select">Select status</option>
                  <option value="present">Present</option>
                  <option value="absent">Leave</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={backdateForm.reason}
                  onChange={e => setBackdateForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={submittingBackdate}>
                {submittingBackdate ? 'Submitting...' : 'Submit Backdate Request'}
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeAttendance; 