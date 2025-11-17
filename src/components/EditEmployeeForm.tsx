import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';

const editEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['employee', 'reporting_manager', 'admin', 'super_admin']),
  department: z.string().optional(),
  position: z.string().optional(),
  hire_date: z.string().optional(),
  is_active: z.boolean().optional(),
  team_id: z.string().optional(),
  reporting_manager_id: z.string().optional(),
});

type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active: boolean;
  team_id?: string;
  reporting_manager_id?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
}

interface EditEmployeeFormProps {
  employee: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

const EditEmployeeForm: React.FC<EditEmployeeFormProps> = ({ employee, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [teams, setTeams] = useState<Team[]>([]);
  const [reportingManagers, setReportingManagers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<EditEmployeeForm>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: employee.name,
      email: employee.email,
      role: employee.role as 'employee' | 'reporting_manager' | 'admin' | 'super_admin',
      department: employee.department || '',
      position: employee.position || '',
      hire_date: employee.hire_date || '',
      is_active: employee.is_active,
      team_id: employee.team_id || '',
      reporting_manager_id: employee.reporting_manager_id || '',
    },
  });

  // Fetch teams and reporting managers
  useEffect(() => {
    const fetchData = async () => {
      if (!currentCompany) return;

      try {
        // Fetch teams filtered by company_id
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true);

        if (teamsData) {
          setTeams(teamsData);
        }

        // Fetch reporting managers filtered by company_id
        const { data: managersData } = await supabase
          .from('employees')
          .select('id, name, email, department')
          .eq('company_id', currentCompany.id)
          .eq('role', 'reporting_manager')
          .eq('is_active', true);

        if (managersData) {
          setReportingManagers(managersData);
        }
      } catch (error) {
        console.error('Error fetching teams and managers:', error);
      }
    };

    fetchData();
  }, [currentCompany]);

  const onSubmit = async (data: EditEmployeeForm) => {
    if (!currentCompany) {
      toast({
        title: "Error",
        description: "Company information not available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if user can edit this employee
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        toast({
          title: "Error",
          description: "You don't have permission to edit employees",
          variant: "destructive",
        });
        return;
      }

      // Prevent admin from editing super admin
      if (user.role === 'admin' && employee.role === 'super_admin') {
        toast({
          title: "Error",
          description: "Admins cannot edit Super Admin accounts",
          variant: "destructive",
        });
        return;
      }

      // Prevent role escalation beyond user's level
      if (user.role === 'admin' && data.role === 'admin' && employee.role !== 'admin') {
        toast({
          title: "Error",
          description: "Admins cannot promote users to Admin role",
          variant: "destructive",
        });
        return;
      }

      // Prevent admin from promoting to super admin
      if (user.role === 'admin' && data.role === 'super_admin') {
        toast({
          title: "Error",
          description: "Admins cannot promote users to Super Admin role",
          variant: "destructive",
        });
        return;
      }

      console.log('Updating employee:', employee.id, data);
      
      const updateObj: any = {
          name: data.name,
          email: data.email,
          role: data.role,
          department: data.department || null,
          position: data.position || null,
          team_id: data.team_id === 'no_team' ? null : data.team_id || null,
          reporting_manager_id: data.reporting_manager_id === 'no_manager' ? null : data.reporting_manager_id || null,
      };
      if (user && ['admin', 'super_admin'].includes(user.role)) {
        updateObj.hire_date = data.hire_date || null;
        updateObj.is_active = data.is_active;
      }

      const { error } = await supabase
        .from('employees')
        .update(updateObj)
        .eq('id', employee.id);

      if (error) {
        console.error('Error updating employee:', error);
        toast({
          title: "Error",
          description: "Failed to update employee",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} placeholder="Select role">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="reporting_manager">Reporting Manager</SelectItem>
                  {user?.role === 'super_admin' && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Department</FormLabel>
              <FormControl>
                <Input placeholder="Enter department" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="Enter position" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

            <FormField
              control={form.control}
              name="hire_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hire Date</FormLabel>
                  <FormControl>
                  <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {/* Team Assignment */}
        <FormField
          control={form.control}
          name="team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Assignment</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_team">No Team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reporting Manager Assignment */}
        <FormField
          control={form.control}
          name="reporting_manager_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporting Manager</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting manager (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_manager">No Manager</SelectItem>
                  {reportingManagers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {user && ['admin', 'super_admin'].includes(user.role) && (
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable or disable this employee account
                  </div>
                </div>
                  <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  </FormControl>
                </FormItem>
              )}
            />
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="gradient" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Employee'}
          </Button>
          <Button type="button" variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditEmployeeForm;
