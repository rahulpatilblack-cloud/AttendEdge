import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LeaveFormValues = {
  leave_type_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  leave_duration: 'full_day' | 'half_day';
  half_day_period?: 'morning' | 'afternoon';
  reason: string;
};

interface ProjectLeaveFormProps {
  projectId: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

const ProjectLeaveForm: React.FC<ProjectLeaveFormProps> = ({
  projectId,
  onSubmitted,
  onCancel,
}) => {
  const { user } = useAuth();
  const { createLeaveRequest } = useProjects();
  const { toast } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<LeaveFormValues>({
    defaultValues: {
      leave_type_id: '',
      start_date: '',
      end_date: '',
      leave_duration: 'full_day',
      half_day_period: 'morning',
      reason: '',
    },
  });

  const watchLeaveDuration = form.watch('leave_duration');

  /* ===============================
     Load Leave Types
  =============================== */
  useEffect(() => {
    const loadLeaveTypes = async () => {
      const { data } = await supabase
        .from('leave_types')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');

      setLeaveTypes(data || []);
    };

    loadLeaveTypes();
  }, []);

  /* ===============================
     Date Helpers (FIXED)
  =============================== */

  // Convert Date → YYYY-MM-DD (local-safe)
  const toLocalDateString = (date: Date) => {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  };

  // Safely create Date from YYYY-MM-DD
  const createLocalDate = (dateStr: string) => {
    if (!dateStr) return undefined;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(dateStr.split('T')[0]);
  };

  // Calculate days based on leave duration
  const calculateDays = (start: string, end: string, duration: 'full_day' | 'half_day') => {
    if (!start || !end) return 0;

    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);

    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);

    // Calculate full days between dates (inclusive)
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (duration === 'half_day' && diffDays === 1) {
      return 0.5; // Single half day
    }
    
    // For multiple days, only count full days
    return diffDays > 0 ? diffDays : 0;
  };

  /* ===============================
     Submit
  =============================== */
  const onSubmit = async (values: LeaveFormValues) => {
    if (!user) return;

    const totalDays = calculateDays(
      values.start_date,
      values.end_date,
      values.leave_duration
    );

    try {
      setLoading(true);

      const leaveData: any = {
        project_id: projectId,
        consultant_id: user.id,
        leave_type_id: values.leave_type_id,
        start_date: values.start_date,
        end_date: values.end_date,
        total_days: totalDays,
        leave_duration: values.leave_duration,
        reason: values.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // Add half day period if it's a half day leave
      if (values.leave_duration === 'half_day') {
        leaveData.half_day_period = values.half_day_period;
        
        // If it's a half day, start and end dates should be the same
        if (values.start_date !== values.end_date) {
          leaveData.end_date = values.start_date; // Ensure end date matches start date for half day
        }
      }

      await createLeaveRequest(leaveData);

      toast({
        title: 'Leave request submitted',
        description:
          'Your project leave request has been sent for approval.',
      });

      onSubmitted?.();
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     UI
  =============================== */
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Leave Type */}
        <FormField
          control={form.control}
          name="leave_type_id"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Leave Duration */}
        <FormField
          control={form.control}
          name="leave_duration"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Leave Duration</FormLabel>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="full_day"
                    value="full_day"
                    checked={field.value === 'full_day'}
                    onChange={() => field.onChange('full_day')}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <label htmlFor="full_day" className="text-sm font-medium">
                    Full Day
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="half_day"
                    value="half_day"
                    checked={field.value === 'half_day'}
                    onChange={() => field.onChange('half_day')}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <label htmlFor="half_day" className="text-sm font-medium">
                    Half Day
                  </label>
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* Half Day Period (only shown when half day is selected) */}
        {watchLeaveDuration === 'half_day' && (
          <FormField
            control={form.control}
            name="half_day_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Half Day Period</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9 AM - 1 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (1 PM - 6 PM)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <FormField
            control={form.control}
            name="start_date"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value &&
                            'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          (() => {
                            const [y, m, d] =
                              field.value.split('-');
                            return format(
                              new Date(
                                Number(y),
                                Number(m) - 1,
                                Number(d)
                              ),
                              'PPP'
                            );
                          })()
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={
                        field.value
                          ? createLocalDate(field.value)
                          : undefined
                      }
                      onSelect={(date) =>
                        date &&
                        field.onChange(
                          toLocalDateString(date)
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date */}
          <FormField
            control={form.control}
            name="end_date"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value &&
                            'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          (() => {
                            const [y, m, d] =
                              field.value.split('-');
                            return format(
                              new Date(
                                Number(y),
                                Number(m) - 1,
                                Number(d)
                              ),
                              'PPP'
                            );
                          })()
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={
                        field.value
                          ? createLocalDate(field.value)
                          : undefined
                      }
                      onSelect={(date) =>
                        date &&
                        field.onChange(
                          toLocalDateString(date)
                        )
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Reason */}
        <FormField
          control={form.control}
          name="reason"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter reason for leave"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectLeaveForm;
