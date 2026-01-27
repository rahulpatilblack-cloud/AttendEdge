// src/pages/leaves/allocations.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface ProjectAllocation {
  project_id: string;
  project_name: string;
  consultant_id: string;
  consultant_name: string;
  allocated_hours: number;
}

export default function ProjectLeavesAllocation() {
  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch project allocations
  const fetchProjectAllocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('consultant_projects')
        .select(`
          project_id,
          projects:project_id(name),
          consultant_id,
          employees:consultant_id(name),
          allocated_hours
        `)
        .order('projects(name)', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(item => ({
        project_id: item.project_id,
        project_name: item.projects?.name || 'Unknown Project',
        consultant_id: item.consultant_id,
        consultant_name: item.employees?.name || 'Unknown Consultant',
        allocated_hours: item.allocated_hours || 0
      }));

      setAllocations(formattedData);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch project allocations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle allocation change
  const handleAllocationChange = (index: number, value: string) => {
    const newAllocations = [...allocations];
    newAllocations[index] = {
      ...newAllocations[index],
      allocated_hours: parseFloat(value) || 0
    };
    setAllocations(newAllocations);
  };

  // Save allocations
  const saveAllocations = async () => {
    try {
      setIsSaving(true);
      
      const updates = allocations.map(allocation => ({
        project_id: allocation.project_id,
        consultant_id: allocation.consultant_id,
        allocated_hours: allocation.allocated_hours
      }));

      const { error } = await supabase
        .from('consultant_projects')
        .upsert(updates, { onConflict: 'project_id,consultant_id' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Project allocations saved successfully',
      });
    } catch (error) {
      console.error('Error saving allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project allocations',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchProjectAllocations();
  }, []);

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Project Leaves Allocation</h1>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={fetchProjectAllocations}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button 
            onClick={saveAllocations}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Consultant</TableHead>
                <TableHead className="text-right">Allocated Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.length > 0 ? (
                allocations.map((allocation, index) => (
                  <TableRow key={`${allocation.project_id}-${allocation.consultant_id}`}>
                    <TableCell className="font-medium">{allocation.project_name}</TableCell>
                    <TableCell>{allocation.consultant_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={allocation.allocated_hours}
                          onChange={(e) => handleAllocationChange(index, e.target.value)}
                          className="w-32 text-right"
                        />
                        <span className="ml-2">hours</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No project allocations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}