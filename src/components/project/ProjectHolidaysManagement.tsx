import React, { useEffect, useMemo, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const ProjectHolidaysManagement: React.FC = () => {
  const { projects, loading, error, fetchProjects, fetchHolidays, createHoliday, deleteHoliday } = useProjects();
  const { user } = useAuth();
  const [listOpen, setListOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ holiday_name: '', date: '', description: '' });
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const visibleProjects = useMemo(() => {
    return projects || [];
  }, [projects]);

  const activeProject = useMemo(() => {
    return visibleProjects.find((p: any) => p.id === activeProjectId) || null;
  }, [visibleProjects, activeProjectId]);

  useEffect(() => {
    const loadHolidays = async () => {
      if (!activeProjectId) return;
      setHolidaysLoading(true);
      try {
        const data = await fetchHolidays(activeProjectId);
        setHolidays(data || []);
      } finally {
        setHolidaysLoading(false);
      }
    };

    if (listOpen && activeProjectId) {
      loadHolidays();
    }
  }, [listOpen, activeProjectId, fetchHolidays]);

  const resetForm = () => {
    setFormData({ holiday_name: '', date: '', description: '' });
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !selectedConsultantId || !formData.holiday_name || !formData.date) return;

    setSaving(true);
    try {
      await createHoliday({
        holiday_name: formData.holiday_name,
        date: formData.date,
        description: formData.description || null,
        consultant_id: selectedConsultantId,
        project_id: activeProjectId,
      } as any);

      toast({ title: 'Holiday added', description: 'Project holiday has been created.' });
      const data = await fetchHolidays(activeProjectId);
      setHolidays(data || []);
      resetForm();
    } catch (err) {
      console.error('Error adding holiday', err);
      toast({ title: 'Error', description: 'Failed to add holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!activeProjectId) return;
    setSaving(true);
    try {
      await deleteHoliday(id);
      toast({ title: 'Holiday deleted', description: 'Project holiday has been removed.' });
      const data = await fetchHolidays(activeProjectId);
      setHolidays(data || []);
    } catch (err) {
      console.error('Error deleting holiday', err);
      toast({ title: 'Error', description: 'Failed to delete holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-bold">Project Holidays</h1>
      </div>

      {visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-3" />
            No projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleProjects.map((project: any) => (
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
                      Manage Holidays
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Manage Project Holidays</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeProject && (
              <div className="space-y-1 text-sm">
                <div className="font-medium">Consultant</div>
                {Array.isArray((activeProject as any).members) && (activeProject as any).members.length > 0 ? (
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedConsultantId}
                    onChange={(e) => setSelectedConsultantId(e.target.value)}
                  >
                    <option value="">Select consultant</option>
                    {(activeProject as any).members.map((m: any) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.first_name} {m.last_name} ({m.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No consultants are assigned to this project. Assign consultants in Project Team Management first.
                  </div>
                )}
              </div>
            )}

            {holidaysLoading ? (
              <div className="py-2 text-sm text-muted-foreground">Loading holidays...</div>
            ) : holidays.length === 0 ? (
              <div className="py-2 text-sm text-muted-foreground">No holidays defined for this project.</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {holidays.map((h: any) => (
                  <div key={h.id} className="flex justify-between items-start p-3 border rounded-md">
                    <div>
                      <div className="font-medium text-sm">{h.holiday_name || 'Holiday'}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(h.date).toLocaleDateString()}
                      </div>
                      {h.description && (
                        <div className="text-xs text-muted-foreground mt-1">{h.description}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteHoliday(h.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddHoliday} className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Holiday name"
                  value={formData.holiday_name}
                  onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={saving || !formData.holiday_name || !formData.date}>
                  {saving ? 'Saving...' : 'Add Holiday'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectHolidaysManagement;
