import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { useUsers } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, UserPlus, User, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectMember } from '@/types';

const teamMemberSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  role: z.string().min(1, 'Role is required'),
  allocation_percentage: z.coerce.number().min(0).max(100, 'Allocation cannot exceed 100%'),
  join_date: z.string().min(1, 'Join date is required'),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

const ProjectTeamMemberPage = () => {
  const { projectId, memberId } = useParams<{ projectId: string; memberId?: string }>();
  const navigate = useNavigate();
  const { projects, loading, fetchProject, addTeamMember, updateTeamMember } = useProjects();
  const { users, loading: usersLoading } = useUsers();
  const [project, setProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      employee_id: '',
      role: 'member',
      allocation_percentage: 100,
      join_date: new Date().toISOString().split('T')[0],
    },
  });

  // Load project and member data
  useEffect(() => {
    const loadData = async () => {
      if (projectId) {
        const projectData = await fetchProject(projectId);
        setProject(projectData);
        
        // If editing an existing member, load their data
        if (memberId && projectData?.members) {
          const member = projectData.members.find((m: any) => m.id === memberId);
          if (member) {
            form.reset({
              employee_id: member.employee_id,
              role: member.role,
              allocation_percentage: member.allocation_percentage,
              join_date: member.join_date ? member.join_date.split('T')[0] : new Date().toISOString().split('T')[0],
            });
          }
        }
      }
    };
    
    loadData();
  }, [projectId, memberId, fetchProject, form]);

  const onSubmit = async (data: TeamMemberFormValues) => {
    if (!projectId) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const memberData = {
        ...data,
        join_date: new Date(data.join_date).toISOString(),
      };
      
      if (memberId) {
        // Update existing member
        await updateTeamMember(projectId, memberId, memberData);
      } else {
        // Add new member
        await addTeamMember(projectId, memberData);
      }
      
      // Navigate back to the team page
      navigate(`/project-team/${projectId}`);
    } catch (err) {
      console.error('Error saving team member:', err);
      setError('Failed to save team member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get available employees (those not already in the project)
  const availableEmployees = users.filter(user => {
    if (!project?.members) return true;
    return !project.members.some((m: any) => m.employee_id === user.id);
  });

  if ((loading || usersLoading) && !project) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex justify-end space-x-2 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {memberId ? 'Edit Team Member' : 'Add Team Member'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Member</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!memberId} // Disable changing employee when editing
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableEmployees.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({user.email})
                          </SelectItem>
                        ))}
                        {availableEmployees.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No available employees to add
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="team_lead">Team Lead</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="designer">Designer</SelectItem>
                        <SelectItem value="qa">QA Engineer</SelectItem>
                        <SelectItem value="member">Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allocation_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocation (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="5"
                        placeholder="e.g., 50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="join_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Join Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || availableEmployees.length === 0}>
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {memberId ? 'Update Member' : 'Add Member'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ProjectTeamMemberPage;
