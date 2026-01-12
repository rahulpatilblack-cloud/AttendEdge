import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Project, User } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Save, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const createProjectSchema = z.object({
  assignment_id: z.string().min(1, 'Assignment ID is required'),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']),
  end_client: z.string().min(1, 'End client is required'),
  allocation_percentage: z.number().min(1).max(100).default(100),
}).refine(
  (data) => {
    if (!data.end_date) return true;
    return new Date(data.end_date) >= new Date(data.start_date);
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

const editProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'on_hold', 'completed', 'cancelled']),
  allocation_percentage: z.number().min(1).max(100).default(100),
}).refine(
  (data) => {
    if (!data.end_date) return true;
    return new Date(data.end_date) >= new Date(data.start_date);
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

type ProjectFormValues = z.infer<typeof projectSchema>;

interface Consultant {
  id: string;
  name: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
}

interface ProjectFormProps {
  project: Partial<Project> & { 
    members?: Array<{ 
      user_id: string; 
      role: string;
      allocation_percentage: number;
      start_date: string;
      end_date: string | null;
    }> 
  };
  onSubmit: (data: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string | null;
    status: 'active' | 'on_hold' | 'completed' | 'cancelled';
    client_name: string;
    end_client?: string | null;
    allocation_percentage: number;
    members: Array<{
      consultant_id: string;
      role: string;
      allocation_percentage: number;
      start_date: string;
      end_date: string | null;
      is_active: boolean;
    }>;
  }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [selectedConsultants, setSelectedConsultants] = useState<Consultant[]>([]);
  
  // Helper function to convert date to YYYY-MM-DD format in local time
  const toLocalDateString = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
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

  // Check if we're in edit mode (project has an ID)
  const isEditMode = !!project.id;

  // Initialize form with default values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(isEditMode ? editProjectSchema : createProjectSchema),
    defaultValues: {
      name: project.name || '',
      description: project.description || '',
      client_name: project.client_name || '',
      start_date: project.start_date ? toLocalDateString(project.start_date) : toLocalDateString(new Date()),
      end_date: project.end_date ? toLocalDateString(project.end_date) : null,
      status: (project.status as any) || 'active',
      allocation_percentage: 100,
      ...(!isEditMode && {
        assignment_id: project.assignment_id || '',
        end_client: project.end_client || ''
      })
    },
  });

  // Only watch for assignment_id and end_client in create mode
  const assignmentId = form.watch('assignment_id');
  const endClient = form.watch('end_client');

  // Update project name when assignment_id or end_client changes (only in create mode)
  useEffect(() => {
    if (isEditMode) return;
    
    if (assignmentId && endClient) {
      form.setValue('name', `${assignmentId} - ${endClient}`, { shouldValidate: true });
    } else if (assignmentId) {
      form.setValue('name', assignmentId, { shouldValidate: true });
    } else if (endClient) {
      form.setValue('name', endClient, { shouldValidate: true });
    } else {
      form.setValue('name', '', { shouldValidate: true });
    }
  }, [assignmentId, endClient, form, isEditMode]);

  // Fetch employees using shared hook (scoped to current company)
  const { employees, isLoading: isLoadingEmployees } = useEmployees();

  // Initialize selected consultants when project or form loads
  useEffect(() => {
    if (project.members && project.members.length > 0) {
      const initialConsultants = project.members.map(member => ({
        id: member.user_id,
        name: 'user_id' in member ? `User ${member.user_id}` : 'Unknown User',
        role: member.role || 'member',
        allocation_percentage: member.allocation_percentage || 100,
        start_date: member.start_date || form.getValues('start_date'),
        end_date: member.end_date || null,
      }));
      setSelectedConsultants(initialConsultants);
    }
  }, [project.members, form]);

  // Handle assigning a consultant (single consultant per project)
  const handleAddConsultant = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const newConsultant: Consultant = {
      id: employeeId,
      name: employee.name || employee.email || 'Unknown',
      role: 'member',
      allocation_percentage: form.getValues('allocation_percentage') || 100,
      start_date: form.getValues('start_date') || new Date().toISOString().split('T')[0],
      end_date: form.getValues('end_date') || null,
    };

    // Replace any existing consultant to enforce single assignment
    setSelectedConsultants([newConsultant]);
  };

  // Handle removing a consultant
  const handleRemoveConsultant = (consultantId: string) => {
    setSelectedConsultants(selectedConsultants.filter(c => c.id !== consultantId));
  };

  // Handle form submission
  const handleFormSubmit = (data: ProjectFormValues) => {
    const projectData = {
      name: data.name,
      description: data.description,
      client_name: data.client_name,
      start_date: data.start_date,
      end_date: data.end_date || null,
      status: data.status,
      end_client: data.end_client || null,
      allocation_percentage: data.allocation_percentage,
      members: selectedConsultants.map(consultant => ({
        consultant_id: consultant.id,
        role: consultant.role,
        allocation_percentage: consultant.allocation_percentage,
        start_date: consultant.start_date,
        end_date: consultant.end_date || null,
        is_active: true,
      })),
    };

    onSubmit(projectData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!isEditMode && (
            <>
              <FormField
                control={form.control}
                name="assignment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment ID *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter assignment ID" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Client *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter end client name" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className={isEditMode ? "col-span-2" : "col-span-2"}>
                <FormLabel>Project Name {!isEditMode && "(Auto-generated)"}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={isEditMode ? "Enter project name" : "Project name will be generated automatically"}
                    {...field} 
                    readOnly={!isEditMode}
                    className={isEditMode ? "" : "bg-gray-50"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter client name" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="start_date"
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
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          (() => {
                            const [y, m, d] = field.value.split('-');
                            return format(
                              new Date(Number(y), Number(m) - 1, Number(d)),
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? createLocalDate(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(toLocalDateString(date));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          (() => {
                            const [y, m, d] = field.value.split('-');
                            return format(
                              new Date(Number(y), Number(m) - 1, Number(d)),
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? createLocalDate(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(toLocalDateString(date));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <FormLabel>Default Allocation (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter allocation percentage"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      
        {/* Team Members Section */}
        <div className="space-y-4 mt-6 col-span-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Assigned Consultant</h3>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedConsultants[0]?.id || ''}
                onValueChange={(value) => {
                  handleAddConsultant(value);
                }}
              >
                <SelectTrigger className="w-[240px]" data-testid="assign-consultant-select">
                  <SelectValue placeholder="Select consultant" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEmployees && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">Loading employees...</div>
                  )}
                  {!isLoadingEmployees && employees && employees.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">No employees found for this company</div>
                  )}
                  {employees && employees.map((employee: any) => {
                    const displayName = employee.name || employee.email;
                    return (
                      <SelectItem key={employee.id} value={employee.id}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedConsultants.length > 0 && (
            <div className="border rounded-md divide-y">
              {selectedConsultants.map((consultant) => (
                <div key={consultant.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{consultant.name}</div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="w-40">
                        <Select
                          value={consultant.role}
                          onValueChange={(value) => {
                            setSelectedConsultants(
                              selectedConsultants.map(c => 
                                c.id === consultant.id 
                                  ? { ...c, role: value } 
                                  : c
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="qa">QA Tester</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={consultant.allocation_percentage}
                          onChange={(e) => {
                            const value = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                            setSelectedConsultants(
                              selectedConsultants.map(c => 
                                c.id === consultant.id 
                                  ? { ...c, allocation_percentage: value } 
                                  : c
                              )
                            );
                          }}
                          className="w-full"
                        />
                      </div>
                      <span>%</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveConsultant(consultant.id)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      
        <div className="flex justify-end space-x-3 pt-4 border-t col-span-full">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
                Save Project
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectForm;
