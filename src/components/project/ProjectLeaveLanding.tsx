import React, { useEffect, useMemo, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProjectLeaveForm from '@/components/project/ProjectLeaveForm';
import ProjectLeaveList from '@/components/project/ProjectLeaveList';

const ProjectLeaveLanding: React.FC = () => {
  const { projects, loading, error, fetchProjects } = useProjects();
  const { user } = useAuth();
  const [applyOpen, setApplyOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const myProjects = useMemo(() => {
    return (projects || []).filter((p: any) => p?.members?.some((m: any) => m.user_id === user?.id));
  }, [projects, user?.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project Leave</h1>
      </div>

      {myProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-3" />
            No assigned projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {myProjects.map((project: any) => (
            <Card key={project.id} className="border">
              <CardHeader>
                <CardTitle className="text-base">{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(project.start_date).toLocaleDateString()} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Ongoing'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveProjectId(project.id);
                        setListOpen(true);
                      }}
                    >
                      View Leaves
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveProjectId(project.id);
                        setApplyOpen(true);
                      }}
                    >
                      Apply Leave
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply Leave dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Apply Project Leave</DialogTitle>
          </DialogHeader>
          {activeProjectId && (
            <ProjectLeaveForm
              projectId={activeProjectId}
              onSubmitted={() => {
                setApplyOpen(false);
                setActiveProjectId(null);
              }}
              onCancel={() => {
                setApplyOpen(false);
                setActiveProjectId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Leaves dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Project Leave Requests</DialogTitle>
          </DialogHeader>
          {activeProjectId && <ProjectLeaveList projectId={activeProjectId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectLeaveLanding;
