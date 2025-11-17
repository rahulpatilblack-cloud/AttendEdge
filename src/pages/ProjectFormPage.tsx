import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import ProjectForm from '@/components/project/ProjectForm';
import { Project } from '@/types';

const ProjectFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { projects, loading, createProject, updateProject } = useProjects();
  const [project, setProject] = useState<Partial<Project> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project data if in edit mode
  useEffect(() => {
    if (id) {
      const existingProject = projects.find(p => p.id === id);
      if (existingProject) {
        setProject(existingProject);
      }
    } else {
      // Initialize new project with default values
      setProject({
        name: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active',
        client_name: '',
        budget: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }, [id, projects]);

  const handleSubmit = async (data: Partial<Project>) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (id) {
        // Update existing project
        await updateProject(id, data);
      } else {
        // Create new project
        await createProject(data);
      }
      navigate('/manage-projects');
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
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

  if (id && !project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">Project not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
          {id ? 'Edit Project' : 'Create New Project'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {project && (
        <div className="bg-white rounded-lg border p-6">
          <ProjectForm 
            project={project} 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting}
            onCancel={() => navigate('/manage-projects')}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectFormPage;
