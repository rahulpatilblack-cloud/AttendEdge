
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, Trash2, CalendarDays } from 'lucide-react';
import { CustomCalendar } from '@/components/CustomCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_recurring?: boolean;
  created_at: string;
  updated_at: string;
}

const HolidayManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to get holidays for current visible month
  const holidaysInMonth = holidays.filter(h => {
    const date = parseISO(h.date);
    return date.getFullYear() === selectedMonth.getFullYear() && date.getMonth() === selectedMonth.getMonth();
  });
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    is_recurring: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching holidays:', error);
        return;
      }

      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Holiday name is required';
    }
    
    if (!formData.date) {
      errors.date = 'Please select a date';
    } else if (new Date(formData.date) < new Date(new Date().setHours(0, 0, 0, 0)) && !formData.is_recurring) {
      errors.date = 'Cannot add holidays for past dates';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkForDuplicate = (date: string, name: string): boolean => {
    return holidays.some(holiday => 
      holiday.date === date && 
      holiday.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Error",
        description: "Only admins and super admins can add holidays",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    if (checkForDuplicate(formData.date, formData.name)) {
      toast({
        title: "Error",
        description: "A holiday with this name and date already exists",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('holidays')
        .insert([{
          name: formData.name,
          date: formData.date,
          description: formData.description,
          is_recurring: formData.is_recurring
        }]);

      if (error) {
        console.error('Error adding holiday:', error);
        toast({
          title: "Error",
          description: "Failed to add holiday",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Holiday added successfully"
      });

      setFormData({ name: '', date: '', description: '', is_recurring: false });
      setShowAddForm(false);
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId: string, holidayName: string) => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Error",
        description: "Only admins and super admins can delete holidays",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId);

      if (error) {
        console.error('Error deleting holiday:', error);
        toast({
          title: "Error",
          description: "Failed to delete holiday",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `${holidayName} has been deleted`
      });

      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const canManageHolidays = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Holiday Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-1" /> Calendar View
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <CalendarDays className="w-4 h-4 mr-1" /> List View
          </Button>
          {canManageHolidays && (
            <Button onClick={() => setShowAddForm(true)} variant="gradient">
              <Plus className="w-4 h-4 mr-2" /> Add Holiday
          </Button>
        )}
        </div>
      </div>

      

      {/* Add Holiday Form (shown in both views) */}
      {showAddForm && canManageHolidays && (
        <Card className="border-2 border-blue-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add New Holiday</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', date: '', description: '', is_recurring: false });
                  setFormErrors({});
                }}
              >
                Cancel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="holiday-name">Holiday Name *</Label>
                  <Input
                    id="holiday-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., New Year's Day"
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="holiday-date">Date *</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={formData.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={formErrors.date ? 'border-red-500' : ''}
                  />
                  {formErrors.date && <p className="text-sm text-red-500">{formErrors.date}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="holiday-description">Description (Optional)</Label>
                <Textarea
                  id="holiday-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Add details about the holiday"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="is-recurring" className="text-sm font-medium text-gray-700">
                  This is a recurring holiday (e.g., annual)
                </Label>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add Holiday'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
          <Card className="w-full max-w-none min-h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                Holidays Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <CustomCalendar
                  month={selectedMonth}
                  holidays={holidays}
                  onMonthChange={setSelectedMonth}
                />
                {/* Legend */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                  <span className="text-sm">Holiday</span>
              </div>
              </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Holidays ({holidays.length})
            </CardTitle>
            {!showAddForm && canManageHolidays && (
              <Button 
                onClick={() => setShowAddForm(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No holidays found</h3>
              <p className="text-gray-500 mb-4">No holidays have been added yet</p>
              {canManageHolidays && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="gradient-primary text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Holiday
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <div>
                      <h3 className="font-medium">{holiday.name}</h3>
                      <p className="text-sm text-gray-600">
                          {format(parseISO(holiday.date), 'EEEE, MMMM dd, yyyy')}
                      </p>
                      {holiday.description && (
                        <p className="text-sm text-gray-500 mt-1">{holiday.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                        {parseISO(holiday.date) > new Date() ? 'Upcoming' : 'Past'}
                    </Badge>
                    {holiday.is_recurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                    {canManageHolidays && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{holiday.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default HolidayManagement;
