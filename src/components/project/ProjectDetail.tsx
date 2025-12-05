import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users, Clock, DollarSign, FileText, Edit, Trash2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, loading, error, fetchProject, deleteProject } = useProjects();
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const data = await fetchProject(id);
        setProject(data);
      }
    };
    loadProject();
  }, [id, fetchProject]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await deleteProject(id!);
      navigate('/manage-projects');
    }
  };

  if (loading && !project) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        
        <div className="grid gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error || 'Project not found'}</span>
        </div>
      </div>
    );
  }

  const statusVariant = {
    active: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }[project.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="p-6">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge className={cn('ml-2', statusVariant)}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
          </Badge>
          
          <div className="flex-1 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/project-form/${project.id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
        
        <p className="text-muted-foreground ml-12">{project.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Timeline</span>
          </div>
          <div className="mt-2">
            <p className="text-sm">
              {format(new Date(project.start_date), 'MMM d, yyyy')} -{' '}
              {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'Ongoing'}
            </p>
            <p className="text-xs text-muted-foreground">
              {project.end_date 
                ? `${Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                : 'No end date set'}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">Team Members</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-semibold">{project.members?.length || 0}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs p-0 h-auto"
              onClick={() => setActiveTab('team')}
            >
              View all
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Budget</span>
          </div>
          <div className="mt-2">
            <p className="text-lg font-semibold">
              {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
            </p>
            <p className="text-xs text-muted-foreground">
              {project.client_name ? `Client: ${project.client_name}` : 'No client specified'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1">{project.description || 'No description provided.'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <Badge className={cn('mt-1', statusVariant)}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Start Date</h4>
                <p className="mt-1">{format(new Date(project.start_date), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">End Date</h4>
                <p className="mt-1">
                  {project.end_date 
                    ? format(new Date(project.end_date), 'MMMM d, yyyy')
                    : 'No end date set'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Client</h4>
                <p className="mt-1">{project.client_name || 'No client specified'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Budget</h4>
                <p className="mt-1">
                  {project.budget 
                    ? `$${project.budget.toLocaleString()}` 
                    : 'No budget specified'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity to display</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <Button 
              size="sm" 
              onClick={() => navigate(`/project-team/${project.id}/add`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
          
          {project.members?.length > 0 ? (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocation
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Join Date
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {project.members.map((member: any) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600">
                              {member.employee?.name?.[0] || member.employee?.email?.[0] || '?'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.employee?.name || member.employee?.email || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">{member.employee?.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">{member.role || 'Member'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.allocation_percentage || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.join_date ? format(new Date(member.join_date), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/project-team/${project.id}/edit/${member.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding team members to this project.</p>
              <div className="mt-6">
                <Button
                  onClick={() => navigate(`/project-team/${project.id}/add`)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="leaves" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Leave Requests</h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </div>
          
          <div className="bg-white rounded-lg border p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No leave requests</h3>
            <p className="mt-1 text-sm text-gray-500">No team members have requested leave for this project yet.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Project Documents</h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
          
          <div className="bg-white rounded-lg border p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">No documents have been uploaded for this project yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to combine class names
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default ProjectDetail;
