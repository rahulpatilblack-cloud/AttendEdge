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
import { format } from 'date-fns';

/**
 * Parse YYYY-MM-DD safely without timezone shift
 */
const parseLocalDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const clean = dateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const ProjectHolidaysManagement: React.FC = () => {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    fetchHolidays: fetchProjectHolidays,
    createHoliday,
    deleteHoliday,
  } = useProjects();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [listOpen, setListOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    holiday_name: '',
    date: '',
    description: '',
  });

  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const visibleProjects = useMemo(() => {
    if (!projects) return [];

    if (user?.role === 'employee' || user?.role === 'consultant') {
      return projects.filter(project =>
        project.members?.some(member => member.user_id === user?.id),
      );
    }

    return projects;
  }, [projects, user]);

  const activeProject = useMemo(() => {
    return visibleProjects.find((p: any) => p.id === activeProjectId) || null;
  }, [visibleProjects, activeProjectId]);

  useEffect(() => {
    const loadHolidays = async () => {
      if (!activeProjectId) return;

      setHolidaysLoading(true);
      try {
        let data = await fetchProjectHolidays(activeProjectId);

        if (user?.role === 'employee' || user?.role === 'consultant') {
          data = data.filter((h: any) => h.consultant_id === user?.id);
        }

        setHolidays(data || []);
      } catch (err) {
        console.error(err);
        toast({
          title: 'Error',
          description: 'Failed to load holidays',
          variant: 'destructive',
        });
      } finally {
        setHolidaysLoading(false);
      }
    };

    if (listOpen && activeProjectId) {
      loadHolidays();
    }
  }, [listOpen, activeProjectId, fetchProjectHolidays, user]);

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

      const data = await fetchProjectHolidays(activeProjectId);
      setHolidays(data || []);
      resetForm();
    } catch (err) {
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

      const data = await fetchProjectHolidays(activeProjectId);
      setHolidays(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete holiday', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Project Holidays</h1>

      {visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            <Calendar className="h-6 w-6 mx-auto mb-2" />
            No projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleProjects.map((project: any) => {
            const start = parseLocalDate(project.start_date);
            const end = parseLocalDate(project.end_date);

            return (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {start ? format(start, 'PPP') : '-'} –{' '}
                    {end ? format(end, 'PPP') : 'Ongoing'}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveProjectId(project.id);
                      setListOpen(true);
                    }}
                  >
                    {isAdmin ? 'Manage Holidays' : 'View Holidays'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Manage Project Holidays</DialogTitle>
          </DialogHeader>

          {holidaysLoading ? (
            <div className="text-sm text-muted-foreground">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-sm text-muted-foreground">No holidays defined.</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {holidays.map(h => {
                const date = parseLocalDate(h.date);
                return (
                  <div key={h.id} className="flex justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium text-sm">{h.holiday_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {date ? format(date, 'PPP') : '-'}
                      </div>
                      {h.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {h.description}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteHoliday(h.id)}
                        disabled={saving}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isAdmin && (
            <form onSubmit={handleAddHoliday} className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Holiday name"
                  value={formData.holiday_name}
                  onChange={e => setFormData({ ...formData, holiday_name: e.target.value })}
                />
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Holiday'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectHolidaysManagement;
