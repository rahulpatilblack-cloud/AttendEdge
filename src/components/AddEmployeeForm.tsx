import React from 'react';
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

const addEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['employee', 'reporting_manager', 'admin', 'super_admin']),
  department: z.string().optional(),
  position: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  team_id: z.string().optional(),
  reporting_manager_id: z.string().optional(),
  hire_date: z.string().optional(),
  is_active: z.boolean(),
});

type AddEmployeeForm = z.infer<typeof addEmployeeSchema>;

interface AddEmployeeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DEFAULT_MANAGER_ID = '385fe928-0d70-4adc-9d4e-c11548e52f4f';

const AddEmployeeForm: React.FC<AddEmployeeFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState(currentCompany?.id || '');
  const [teams, setTeams] = React.useState<{ id: string; name: string }[]>([]);
  const [reportingManagers, setReportingManagers] = React.useState<{ id: string; name: string; department: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showAddTeam, setShowAddTeam] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompanyId) return;
      try {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .eq('company_id', selectedCompanyId)
          .eq('is_active', true);
        if (teamsData) setTeams(teamsData);
        const { data: managersData } = await supabase
          .from('employees')
          .select('id, name, department')
          .eq('company_id', selectedCompanyId)
          .eq('role', 'reporting_manager')
          .eq('is_active', true);
        if (managersData) setReportingManagers(managersData);
      } catch (error) {
        console.error('Error fetching teams/managers:', error);
      }
    };
    fetchData();
  }, [selectedCompanyId]);

  // Add new team inline
  const handleAddTeam = async () => {
    if (!newTeamName.trim() || !selectedCompanyId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .insert([{ name: newTeamName, company_id: selectedCompanyId, is_active: true }])
      .select();
    setIsLoading(false);
    if (!error && data && data[0]) {
      setTeams(prev => [...prev, data[0]]);
      setShowAddTeam(false);
      setNewTeamName('');
      form.setValue('team_id', data[0].id);
    }
  };

  const form = useForm<AddEmployeeForm>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'employee',
      department: '',
      position: '',
      password: '',
      team_id: '',
      reporting_manager_id: '',
      hire_date: '',
      is_active: true,
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "You must be logged in to create employees", variant: "destructive" });
        return;
      }
      const payload = {
        ...data,
        team_id: data.team_id === 'no_team' ? null : data.team_id || null,
        reporting_manager_id:
          data.reporting_manager_id === 'no_manager' || !data.reporting_manager_id
            ? DEFAULT_MANAGER_ID
            : data.reporting_manager_id,
        hire_date: data.hire_date || null,
        is_active: data.is_active,
        company_id: currentCompany?.id, // Always use current company
      };
      const { data: result, error } = await supabase.functions.invoke('create-employee', {
        body: payload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to create employee", variant: "destructive" });
        return;
      }
      if (result?.success) {
        toast({ title: "Success", description: result.message || "Employee created successfully and welcome email sent" });
        form.reset();
        onSuccess();
      } else {
        throw new Error(result?.error || 'Unknown error occurred');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create employee", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      {/* Simple debug line for current company */}
      <div style={{ fontWeight: 'bold', marginBottom: 12, color: '#2563eb' }}>
        Current company: {currentCompany ? currentCompany.name : 'No company selected'}
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Removed company field from the form */}
        {/* Show warning if currentCompany is not set */}
        {!currentCompany && (
          <div className="p-4 text-red-600 bg-red-50 rounded">No company selected. Please select a company before adding an employee.</div>
        )}
        {currentCompany && (
          <FormItem>
            <FormLabel>Company</FormLabel>
            <Input value={currentCompany.name} readOnly disabled />
          </FormItem>
        )}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormLabel>Department (Optional)</FormLabel>
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
              <FormLabel>Position (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter position" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temporary Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter temporary password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Team Assignment - always visible, with add option if no teams */}
        <FormField
          control={form.control}
          name="team_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Assignment</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={teams.length ? "Select team (optional)" : "No teams available"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no_team">No Team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teams.length === 0 && (
                <div className="mt-2">
                  <Button type="button" size="sm" onClick={() => setShowAddTeam(true)}>
                    Add Team
                  </Button>
                </div>
              )}
              {showAddTeam && (
                <div className="flex gap-2 mt-2">
                  <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team name" />
                  <Button type="button" size="sm" onClick={handleAddTeam} disabled={isLoading || !newTeamName.trim()}>
                    {isLoading ? 'Adding...' : 'Save'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAddTeam(false)}>Cancel</Button>
                </div>
              )}
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
                    <SelectItem key={manager.id} value={manager.id}>{manager.name} ({manager.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hire Date */}
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

        {/* Active Status */}
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
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="gradient" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Employee'}
          </Button>
          <Button type="button" variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddEmployeeForm;
