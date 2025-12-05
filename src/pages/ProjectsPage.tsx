import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Calendar, Clock, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjectForm from '@/components/project/ProjectForm';
import { Project } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

const ProjectsPage = () => {
  const { projects, loading, error, fetchProjects, deleteProject, createProject, updateProject } = useProjects();
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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

  // Fetch project members for editing (use consultant_projects to match context CRUD)
  const { data: projectMembers = [] } = useQuery({
    queryKey: ['projectMembers', editingProject?.id],
    queryFn: async () => {
      if (!editingProject?.id) return [];
      
      const { data, error } = await supabase
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

  const handleViewTeam = (projectId: string) => {
    navigate(`/project-team/${projectId}`);
  };

  // Load employees for assignment dropdown
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleAssignConsultant = async (proj: Project, consultantId: string) => {
    try {
      await updateProject(proj.id as unknown as string, {
        name: proj.name,
        description: proj.description,
        status: proj.status,
        client_name: (proj as any).client_name,
        members: [
          {
            consultant_id: consultantId,
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
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-24" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          ))}
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
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <Button 
            onClick={handleNewProject}
            className="bg-primary hover:bg-primary/90 text-white whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects</h3>
          <p className="mt-2 text-sm text-gray-600">Get started by creating a new project.</p>
          <div className="mt-6">
            <Button
              onClick={handleNewProject}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    
                    <div className="flex items-center mt-3 text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="mr-4">
                        {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : project.status === 'completed' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 items-center">
                    <div className="w-[220px]">
                      <Select
                        value={(project as any).members?.[0]?.user_id || ''}
                        onValueChange={(val) => handleAssignConsultant(project, val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Assign consultant" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingEmployees && (
                            <div className="px-2 py-1 text-xs text-muted-foreground">Loading employees...</div>
                          )}
                          {!isLoadingEmployees && employees.length === 0 && (
                            <div className="px-2 py-1 text-xs text-muted-foreground">No employees found</div>
                          )}
                          {employees.map((emp: any) => {
                            const displayName = emp.name || emp.email;
                            return (
                              <SelectItem key={emp.id} value={emp.id}>
                                {displayName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(project)}
                      className="text-primary hover:bg-primary/10"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(project.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={{
              ...editingProject,
              members: projectMembers.map(member => ({
                user_id: member.consultant_id,
                role: member.role,
                allocation_percentage: member.allocation_percentage,
                start_date: member.start_date,
                end_date: member.end_date,
              }))
            }}
            onSubmit={handleFormSubmit}
            isSubmitting={false}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
