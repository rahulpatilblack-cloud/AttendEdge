import React, { useEffect, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjectLeaveForm from '@/components/project/ProjectLeaveForm';

const MyProjects = () => {
  const { projects, loading, error, fetchProjects, fetchHolidays } = useProjects();
  const { user } = useAuth();
  const [applyOpen, setApplyOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const loadHolidays = async () => {
      if (!activeProjectId || !holidaysOpen) return;
      setHolidaysLoading(true);
      try {
        const data = await fetchHolidays(activeProjectId);
        setHolidays(data || []);
      } finally {
        setHolidaysLoading(false);
      }
    };

    loadHolidays();
  }, [activeProjectId, holidaysOpen, fetchHolidays]);

  // Filter projects where current user is a team member (ProjectContext maps consultant_id -> user_id)
  const myProjects = projects.filter(project => 
    project.members?.some((member: any) => member.user_id === user?.id)
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
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
        <h1 className="text-2xl font-bold">My Projects</h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search my projects..."
            className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {myProjects.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects assigned</h3>
          <p className="mt-2 text-sm text-gray-600">You haven't been assigned to any projects yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {myProjects.map((project) => {
            const myRole = project.members?.find((member: any) => member.user_id === user?.id)?.role || 'Member';
            
            return (
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
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {myRole}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-sm"
                        onClick={() => {
                          setActiveProjectId(project.id);
                          setApplyOpen(true);
                        }}
                      >
                        Apply Leave
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-sm"
                        onClick={() => {
                          setActiveProjectId(project.id);
                          setHolidaysOpen(true);
                        }}
                      >
                        View Holidays
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Apply Project Leave</DialogTitle>
          </DialogHeader>
          {activeProjectId && (
            <ProjectLeaveForm
              projectId={activeProjectId}
              onSubmitted={() => setApplyOpen(false)}
              onCancel={() => setApplyOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={holidaysOpen} onOpenChange={setHolidaysOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Project Holidays</DialogTitle>
          </DialogHeader>
          {holidaysLoading ? (
            <div className="py-2 text-sm text-muted-foreground">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">No holidays defined for this project.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {holidays.map((h: any) => (
                <div key={h.id} className="p-3 border rounded-md">
                  <div className="font-medium text-sm">{h.holiday_name || 'Holiday'}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.date).toLocaleDateString()}
                  </div>
                  {h.description && (
                    <div className="text-xs text-muted-foreground mt-1">{h.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProjects;
