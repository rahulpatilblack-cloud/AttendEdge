import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  leave_types: {
    name: string;
  };
}

const LeaveCalendar: React.FC = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeaveData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`*, leave_types ( name )`)
        .eq('employee_id', user.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching leave data:', error);
        return;
      }

      // Type cast the status field and filter valid records
      const formattedData = data?.filter(req => req.leave_types)?.map(req => ({
        ...req,
        status: req.status as 'pending' | 'approved' | 'rejected',
        leave_types: req.leave_types as { name: string }
      })) || [];

      setLeaveRequests(formattedData);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user]);

  const getLeaveForDate = (date: Date) => {
    return leaveRequests.filter(request => {
      const startDate = parseISO(request.start_date);
      const endDate = parseISO(request.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const selectedDateLeaves = selectedDate ? getLeaveForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Leave Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              approved: (date) => {
                const leaves = getLeaveForDate(date);
                return leaves.some(leave => leave.status === 'approved');
              },
              pending: (date) => {
                const leaves = getLeaveForDate(date);
                return leaves.some(leave => leave.status === 'pending');
              },
              rejected: (date) => {
                const leaves = getLeaveForDate(date);
                return leaves.some(leave => leave.status === 'rejected');
              }
            }}
            modifiersStyles={{
              approved: { backgroundColor: '#22c55e', color: 'white' },
              pending: { backgroundColor: '#eab308', color: 'white' },
              rejected: { backgroundColor: '#ef4444', color: 'white' }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? format(selectedDate, 'EEEE, MMMM dd, yyyy') : 'Select a Date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate && selectedDateLeaves.length > 0 ? (
            <div className="space-y-4">
              {selectedDateLeaves.map((leave) => (
                <div key={leave.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{leave.leave_types.name}</h4>
                    <Badge variant={getStatusColor(leave.status)}>
                      {leave.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(leave.start_date), 'MMM dd')} - {format(parseISO(leave.end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <p className="text-gray-500">No leave requests for this date</p>
          ) : (
            <p className="text-gray-500">Select a date to view leave details</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveCalendar;
