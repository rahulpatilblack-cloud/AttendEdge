import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Calendar, Clock, Search, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const handleBulkImportComplete = (results: { success: number; failed: number }) => {
    fetchProjects();
    setIsBulkImportOpen(false);
    
    // Show success toast with import results
    if (results.failed > 0) {
      toast({
        title: 'Import Completed with Issues',
        description: `Successfully imported ${results.success} projects, ${results.failed} failed.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${results.success} projects.`,
        variant: 'default',
      });
    }
  };

  const handleBulkUpdateComplete = () => {
    fetchProjects();
    setIsBulkUpdateOpen(false);
    toast({
      title: 'Bulk Update Completed',
      description: 'Project assignments have been updated successfully.',
    });
  };

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

  const handleAssignConsultant = async (proj: Project, consultantId: string) => {
    try {
      await updateProject(proj.id as string, {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex gap-2">
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

      <div className="grid gap-4">
        {projects.map(project => {
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
        onImportComplete={handleBulkImportComplete}
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
