import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Calendar, Clock, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import ProjectForm from '@/components/project/ProjectForm';
import ProjectBulkImportModal from '@/components/project/ProjectBulkImportModal';
import ProjectBulkUpdateModal from '@/components/project/ProjectBulkUpdateModal';
import { Project } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

/**
 * Safely parse YYYY-MM-DD without timezone shifts
 */
const parseLocalDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const ProjectsPage = () => {
  const { projects, loading, error, fetchProjects, deleteProject, createProject, updateProject, bulkImportProjects } = useProjects();
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | Project['status']>('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [consultantId, setConsultantId] = useState<string>('all');
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleBulkImportClosed = () => {
    fetchProjects();
    setIsBulkImportOpen(false);
  };

  const handleBulkUpdateComplete = () => {
    fetchProjects();
    setIsBulkUpdateOpen(false);
    toast({
      title: 'Bulk Update Completed',
      description: 'Project assignments have been updated successfully.',
    });
  };

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('company_id', currentCompany!.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });

  const { data: projectMembers = [] } = useQuery<any[]>({
    queryKey: ['projectMembers', editingProject?.id],
    queryFn: async () => {
      if (!editingProject?.id) return [];
      const { data, error } = await (supabase as any)
        .from('consultant_projects')
        .select('*')
        .eq('project_id', editingProject.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingProject?.id,
  });

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingProject?.id) {
        await updateProject(editingProject.id, data);
      } else {
        await createProject(data);
      }
      setIsDialogOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(projectId);
      fetchProjects();
    }
  };

  const selectedConsultant = useMemo(() => {
    if (consultantId === 'all') return null;
    return employees.find(e => e.id === consultantId) || null;
  }, [consultantId, employees]);

  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

      const search = projectSearch.trim().toLowerCase();
      const client = clientSearch.trim().toLowerCase();

      const matchesProjectSearch = !search
        ? true
        : `${p.name ?? ''} ${p.description ?? ''}`.toLowerCase().includes(search);

      const matchesClientSearch = !client
        ? true
        : `${(p as any).client_name ?? ''}`.toLowerCase().includes(client);

      // Filter by consultant if selected
      let matchesConsultant = true;
      if (consultantId !== 'all') {
        matchesConsultant = (p as any).members?.some((m: any) => m.consultant_id === consultantId || m.user_id === consultantId);
      }

      return matchesStatus && matchesProjectSearch && matchesClientSearch && matchesConsultant;
    });

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return result.slice(startIndex, endIndex);
  }, [projects, statusFilter, projectSearch, clientSearch, consultantId, page, pageSize]);

  const totalFilteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

      const search = projectSearch.trim().toLowerCase();
      const client = clientSearch.trim().toLowerCase();

      const matchesProjectSearch = !search
        ? true
        : `${p.name ?? ''} ${p.description ?? ''}`.toLowerCase().includes(search);

      const matchesClientSearch = !client
        ? true
        : `${(p as any).client_name ?? ''}`.toLowerCase().includes(client);

      // Filter by consultant if selected
      let matchesConsultant = true;
      if (consultantId !== 'all') {
        matchesConsultant = (p as any).members?.some((m: any) => m.consultant_id === consultantId || m.user_id === consultantId);
      }

      return matchesStatus && matchesProjectSearch && matchesClientSearch && matchesConsultant;
    });
  }, [projects, statusFilter, projectSearch, clientSearch, consultantId]);

  const totalPages = Math.ceil(totalFilteredProjects.length / pageSize);

  const clearFilters = () => {
    setStatusFilter('all');
    setProjectSearch('');
    setClientSearch('');
    setConsultantId('all');
    setPage(1);
  };

  const handleAssignConsultant = async (proj: Project, consultantId: string) => {
    try {
      await updateProject(proj.id as string, {
        name: proj.name,
        description: proj.description,
        status: proj.status,
        client_name: (proj as any).client_name,
        members: [
          {
            user_id: consultantId,
            role: 'member',
            allocation_percentage: 100,
            start_date: new Date().toISOString(),
            end_date: null,
            is_active: true,
          },
        ],
      });
      fetchProjects();
    } catch (e) {
      console.error('Failed assigning consultant', e);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong>{error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Projects</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkUpdateOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Bulk Update
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Bulk Import
                </Button>
                <Button onClick={handleNewProject} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredProjects.length} of {totalFilteredProjects.length} projects
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                <div className="md:col-span-2">
                  <Popover open={consultantOpen} onOpenChange={setConsultantOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={consultantOpen} className="w-full justify-between">
                        {selectedConsultant ? `${selectedConsultant.name} (${selectedConsultant.email})` : 'All Consultants'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search consultant..." />
                        <CommandList>
                          <CommandEmpty>No consultant found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setConsultantId('all');
                                setConsultantOpen(false);
                                setPage(1);
                              }}
                            >
                              <Check className={consultantId === 'all' ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                              All Consultants
                            </CommandItem>
                            {employees.map(e => (
                              <CommandItem
                                key={e.id}
                                value={`${e.name} ${e.email}`}
                                onSelect={() => {
                                  setConsultantId(e.id);
                                  setConsultantOpen(false);
                                  setPage(1);
                                }}
                              >
                                <Check className={consultantId === e.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'} />
                                {e.name} ({e.email})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as any); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search project"
                  value={projectSearch}
                  onChange={e => { setProjectSearch(e.target.value); setPage(1); }}
                />
                <Input
                  placeholder="Search client"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setPage(1); }}
                />

                <Select value={pageSize.toString()} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>

                <div className="md:col-span-2 flex gap-2 items-center">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
              {filteredProjects.map(project => {
                const start = parseLocalDate(project.start_date);
                const end = parseLocalDate(project.end_date);

                return (
                  <div
                    key={project.id}
                    className="bg-white border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {project.description}
                          </p>

                          <div className="flex items-center mt-3 text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="mr-4">
                              {start ? format(start, 'PPP') : '-'} –{' '}
                              {end ? format(end, 'PPP') : 'Ongoing'}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                project.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : project.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {project.status.charAt(0).toUpperCase() +
                                project.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(project)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(project.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProjects.length === 0 && totalFilteredProjects.length > 0 && (
                <div className="rounded-md border p-6 text-center text-muted-foreground">
                  No projects on this page
                </div>
              )}
              {filteredProjects.length === 0 && totalFilteredProjects.length === 0 && (
                <div className="rounded-md border p-6 text-center text-muted-foreground">
                  No projects found
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={{
              ...editingProject,
              members: projectMembers.map(m => ({
                user_id: m.consultant_id,
                role: m.role,
                allocation_percentage: m.allocation_percentage,
                start_date: m.start_date,
                end_date: m.end_date,
              })),
            }}
            onSubmit={handleFormSubmit}
            isSubmitting={false}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ProjectBulkImportModal
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImportComplete={handleBulkImportClosed}
      />
      
      <ProjectBulkUpdateModal
        open={isBulkUpdateOpen}
        onOpenChange={setIsBulkUpdateOpen}
        onUpdateComplete={handleBulkUpdateComplete}
      />
    </div>
  );
};

export default ProjectsPage;
