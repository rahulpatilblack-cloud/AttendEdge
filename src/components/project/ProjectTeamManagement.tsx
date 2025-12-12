import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EmployeeList from '@/components/EmployeeList';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const consultantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  role: z.enum(['employee', 'reporting_manager']).default('employee'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ConsultantFormValues = z.infer<typeof consultantSchema>;

const ProjectTeamManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { signup } = useAuth();
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ConsultantFormValues>({
    resolver: zodResolver(consultantSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
      department: '',
      position: 'Consultant',
    },
  });

  const handleAddConsultant = () => {
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    form.reset();
  };

  const DEFAULT_COMPANY_ID = '91fc12c5-61ad-4776-8685-2ab18ee01274';

  const onSubmit = async (data: ConsultantFormValues) => {
    const companyId = currentCompany?.id || DEFAULT_COMPANY_ID;

    setIsLoading(true);
    try {
      // First, sign up the user
      const { success, error, userId } = await signup(
        data.email,
        data.password,
        data.name,
        data.role
      );

      if (success && userId) {
        // Update the user's profile with company and position
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            company_id: companyId,
            position: 'Consultant',
            department: data.department,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw new Error('Failed to update consultant profile');
        }

        toast({
          title: 'Success',
          description: 'Consultant added successfully',
        });
        setShowAddForm(false);
        form.reset();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(error || 'Failed to add consultant');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add consultant',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="p-2"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Add New Consultant</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Consultant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    {...form.register('name')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...form.register('email')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    {...form.register('password')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    {...form.register('confirmPassword')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    onValueChange={(value: 'employee' | 'reporting_manager') =>
                      form.setValue('role', value)
                    }
                    value={form.watch('role')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="reporting_manager">Reporting Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Engineering, Design"
                    {...form.register('department')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.department && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.department.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value="Consultant"
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Consultant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EmployeeList
      onAddEmployee={handleAddConsultant}
      refreshTrigger={refreshTrigger}
      title="Consultants"
      emptyTitle="No consultants found"
      emptySubtitle="Get started by adding your first consultant"
      addButtonLabel="Add Consultant"
      filterRole="employee" // Only show employees with role 'employee' by default
    />
  );
};

export default ProjectTeamManagement;
