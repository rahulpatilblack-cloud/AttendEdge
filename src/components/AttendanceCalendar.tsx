import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'holiday' | 'late';
  check_in_time: string | null;
  check_out_time: string | null;
}

const AttendanceCalendar: React.FC = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const fetchAttendanceData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance data:', error);
        return;
      }

      // Type cast the status field to the expected literal types
      const formattedData = data?.map(record => ({
        ...record,
        status: record.status as 'present' | 'absent' | 'holiday' | 'late'
      })) || [];

      setAttendanceData(formattedData);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [user]);

  const getAttendanceForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendanceData.find(record => record.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      case 'holiday': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const selectedDateAttendance = selectedDate ? getAttendanceForDate(selectedDate) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Attendance Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              present: (date) => {
                const attendance = getAttendanceForDate(date);
                return attendance?.status === 'present';
              },
              late: (date) => {
                const attendance = getAttendanceForDate(date);
                return attendance?.status === 'late';
              },
              absent: (date) => {
                const attendance = getAttendanceForDate(date);
                return attendance?.status === 'absent';
              },
              holiday: (date) => {
                const attendance = getAttendanceForDate(date);
                return attendance?.status === 'holiday';
              }
            }}
            modifiersStyles={{
              present: { backgroundColor: '#22c55e', color: 'white' },
              late: { backgroundColor: '#eab308', color: 'white' },
              absent: { backgroundColor: '#ef4444', color: 'white' },
              holiday: { backgroundColor: '#3b82f6', color: 'white' }
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
          {selectedDate && selectedDateAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(selectedDateAttendance.status)}>
                  {selectedDateAttendance.status}
                </Badge>
              </div>
              
              {selectedDateAttendance.check_in_time && (
                <div>
                  <p className="text-sm text-gray-600">Check In:</p>
                  <p className="font-medium">
                    {format(new Date(selectedDateAttendance.check_in_time), 'HH:mm')}
                  </p>
                </div>
              )}
              
              {selectedDateAttendance.check_out_time && (
                <div>
                  <p className="text-sm text-gray-600">Check Out:</p>
                  <p className="font-medium">
                    {format(new Date(selectedDateAttendance.check_out_time), 'HH:mm')}
                  </p>
                </div>
              )}
            </div>
          ) : selectedDate ? (
            <p className="text-gray-500">No attendance record for this date</p>
          ) : (
            <p className="text-gray-500">Select a date to view attendance details</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;
