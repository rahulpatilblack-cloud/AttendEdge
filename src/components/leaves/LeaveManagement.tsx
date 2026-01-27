// src/components/leaves/LeaveManagement.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { ProjectLeave, LeaveType } from '@/types/leaves';

interface LeaveManagementProps {
  consultantId?: string;
  projectId?: string;
  onClose?: () => void;
}

export function LeaveManagement({ consultantId, projectId, onClose }: LeaveManagementProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [leaves, setLeaves] = useState<ProjectLeave[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<ProjectLeave | null>(null);
  const [hours, setHours] = useState<number>(8);
  const [notes, setNotes] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('full_day');
  const { toast } = useToast();

  // Fetch leaves for the selected date range
  const fetchLeaves = async (startDate: Date, endDate: Date) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/leaves?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`
      );
      const data = await response.json();
      setLeaves(data);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leaves',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setDate(date);
    const existingLeave = leaves.find(
      (leave) => 
        leave.date === format(date, 'yyyy-MM-dd') &&
        (!consultantId || leave.consultant_id === consultantId) &&
        (!projectId || leave.project_id === projectId)
    );
    setSelectedLeave(existingLeave || null);
    setNotes(existingLeave?.notes || '');
    setHours(existingLeave?.hours || 8);
    setLeaveType(existingLeave?.type || 'full_day');
  };

  // Save or update leave
  const handleSaveLeave = async () => {
    if (!date) return;

    try {
      setIsLoading(true);
      const url = selectedLeave 
        ? `/api/leaves/${selectedLeave.id}`
        : '/api/leaves';

      const method = selectedLeave ? 'PUT' : 'POST';
      const body = JSON.stringify({
        consultant_id: consultantId,
        project_id: projectId,
        date: format(date, 'yyyy-MM-dd'),
        hours: leaveType === 'full_day' ? 8 : leaveType === 'half_day' ? 4 : hours,
        type: leaveType,
        notes,
        status: 'approved'
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error('Failed to save leave');
      }

      toast({
        title: 'Success',
        description: `Leave ${selectedLeave ? 'updated' : 'created'} successfully`,
      });

      // Refresh leaves
      const startDate = new Date(date);
      startDate.setMonth(startDate.getMonth() - 1);
      fetchLeaves(startDate, new Date());
    } catch (error) {
      console.error('Error saving leave:', error);
      toast({
        title: 'Error',
        description: 'Failed to save leave',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete leave
  const handleDeleteLeave = async () => {
    if (!selectedLeave) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/leaves/${selectedLeave.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete leave');
      }

      toast({
        title: 'Success',
        description: 'Leave deleted successfully',
      });

      // Reset form
      setSelectedLeave(null);
      setNotes('');
      setHours(8);
      setLeaveType('full_day');
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete leave',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (date) {
      const startDate = new Date(date);
      startDate.setMonth(startDate.getMonth() - 1);
      fetchLeaves(startDate, new Date());
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-md border"
            disabled={(date) => date < new Date('1900-01-01')}
          />
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">
              {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Leave Type
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={leaveType}
                  onChange={(e) => {
                    const type = e.target.value as LeaveType;
                    setLeaveType(type);
                    if (type === 'full_day') setHours(8);
                    else if (type === 'half_day') setHours(4);
                  }}
                  disabled={isLoading}
                >
                  <option value="full_day">Full Day (8 hours)</option>
                  <option value="half_day">Half Day (4 hours)</option>
                  <option value="partial">Partial Day</option>
                </select>
              </div>
              {leaveType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                    disabled={isLoading}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border rounded min-h-[100px]"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            {selectedLeave && (
              <Button
                variant="destructive"
                onClick={handleDeleteLeave}
                disabled={isLoading}
              >
                Delete
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLeave}
              disabled={isLoading || !date}
            >
              {isLoading ? 'Saving...' : selectedLeave ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}