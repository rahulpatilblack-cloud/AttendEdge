import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'present' | 'absent' | 'holiday' | 'late' | 'half_day';
  notes?: string;
}

export const useAttendance = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTodayAttendance = async () => {
    if (!user || !currentCompany) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('company_id', currentCompany.id)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching today attendance:', error);
        return;
      }

      if (data) {
        setTodayAttendance({
          ...data,
          status: data.status as 'present' | 'absent' | 'holiday' | 'late'
        });
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const fetchRecentAttendance = async () => {
    if (!user || !currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('company_id', currentCompany.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching recent attendance:', error);
        return;
      }
      
      const formattedData = data?.map(record => ({
        ...record,
        status: record.status as 'present' | 'absent' | 'holiday' | 'late'
      })) || [];
      
      setRecentAttendance(formattedData);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    }
  };

  const checkIn = async (customTime?: Date) => {
    if (!user || !currentCompany) return false;

    setIsLoading(true);
    try {
      const timestamp = customTime || new Date();
      const today = timestamp.toISOString().split('T')[0];
      const timeString = timestamp.toISOString();

      // Try to update first
      const { data: existing, error: fetchError } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', user.id)
        .eq('company_id', currentCompany.id)
        .eq('date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Check-in fetch error:', fetchError);
        return false;
      }

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update({ check_in_time: timeString, status: 'present' })
          .eq('id', existing.id);
        if (error) {
          console.error('Check-in update error:', error);
          return false;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('attendance')
          .insert({
          employee_id: user.id,
          company_id: currentCompany.id,
          date: today,
          check_in_time: timeString,
          status: 'present'
        });
      if (error) {
          console.error('Check-in insert error:', error);
        return false;
        }
      }
      await fetchTodayAttendance();
      return true;
    } catch (error) {
      console.error('Error checking in:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkOut = async (customTime?: Date) => {
    if (!user || !todayAttendance) return false;

    setIsLoading(true);
    try {
      const timestamp = customTime || new Date();
      const timeString = timestamp.toISOString();

      const { error } = await supabase
        .from('attendance')
        .update({ check_out_time: timeString })
        .eq('id', todayAttendance.id);

      if (error) {
        console.error('Check-out error:', error);
        return false;
      }
      
      await fetchTodayAttendance();
      return true;
    } catch (error) {
      console.error('Error checking out:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendanceForEmployee = async (employeeId: string, status: 'present' | 'absent' | 'late' | 'half_day', selectedDate?: Date) => {
    if (!currentCompany) return false;

    try {
      const now = new Date().toISOString();
      const isHalfDay = status === 'half_day';
      
      // Format the date for the database
      const targetDate = selectedDate || new Date();
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      
      const updateObj: any = {
        status: status, // Use the status directly since 'half_day' is now allowed
        date: dateStr,
        check_in_time: null,
        check_out_time: null,
        updated_at: now
      };

      if (status === 'present' || status === 'late' || status === 'half_day') {
        updateObj.check_in_time = now;
        // For half day, set check_out_time to the same as check_in_time
        updateObj.check_out_time = isHalfDay ? now : null;
      }

      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: employeeId,
          company_id: currentCompany.id,
          date: dateStr,
          ...updateObj,
        });

      if (error) {
        console.error('Error marking attendance:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error marking attendance:', error);
      return false;
    }
  };

  const handleBackdateSubmit = async (backdateForm: {
    employeeId: string;
    date: string;
    status: string;
    reason?: string;
    type?: 'attendance' | 'leave';
  }) => {
    if (!currentCompany) return false;

    try {
      if (!backdateForm.employeeId || !backdateForm.date || !backdateForm.status) {
        console.error('Missing required fields for backdate submission');
        return false;
      }

      if (backdateForm.type === 'attendance' || !backdateForm.type) {
        const { error } = await supabase.from('attendance').upsert({
          employee_id: backdateForm.employeeId,
          company_id: currentCompany.id,
          date: backdateForm.date,
          status: backdateForm.status,
          notes: backdateForm.reason,
          pending_approval: true,
          requestor_role: user?.role,
        });

        if (error) {
          console.error('Error submitting backdate attendance:', error);
          return false;
        }
      } else {
        // For leave requests, you would insert into a leave_requests table
        // This is a placeholder for future implementation
        console.log('Leave request backdate not yet implemented');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting backdate:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user && currentCompany) {
      fetchTodayAttendance();
      fetchRecentAttendance();
    } else {
      setTodayAttendance(null);
      setRecentAttendance([]);
    }
  }, [user, currentCompany]);

  return {
    todayAttendance,
    recentAttendance,
    isLoading,
    checkIn,
    checkOut,
    fetchTodayAttendance,
    fetchRecentAttendance,
    markAttendanceForEmployee,
    handleBackdateSubmit
  };
};
