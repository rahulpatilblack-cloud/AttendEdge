import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, ProjectMember, ProjectLeaveRequest, ProjectHoliday } from '@/types';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTeamMember: (projectId: string, member: Partial<ProjectMember>) => Promise<void>;
  updateTeamMember: (projectId: string, memberId: string, updates: Partial<ProjectMember>) => Promise<void>;
  removeTeamMember: (projectId: string, memberId: string) => Promise<void>;
  fetchTeamMembers: (projectId: string) => Promise<ProjectMember[]>;
  createLeaveRequest: (leaveRequest: Partial<ProjectLeaveRequest>) => Promise<void>;
  updateLeaveRequest: (id: string, updates: Partial<ProjectLeaveRequest>) => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;
  fetchLeaveRequests: (projectId: string) => Promise<ProjectLeaveRequest[]>;
  createHoliday: (holiday: Partial<ProjectHoliday>) => Promise<void>;
  updateHoliday: (id: string, updates: Partial<ProjectHoliday>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  fetchHolidays: (projectId: string) => Promise<ProjectHoliday[]>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects - memoized with useCallback
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First, get all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // If no projects, set empty array and return
      if (!projectsData) {
        setProjects([]);
        return;
      }

      // Get all consultant assignments with consultant details
      const { data: consultantProjects, error: cpError } = await supabase
        .from('consultant_projects')
        .select(`
          *,
          consultant:employees(*)
        `);

      if (cpError) throw cpError;

      // Combine the data
      const projectsWithMembers = projectsData?.map(project => ({
        ...project,
        members: consultantProjects
          ?.filter(cp => cp.project_id === project.id)
          .map(cp => ({
            ...cp,
            user_id: cp.consultant_id,
            first_name: cp.consultant?.first_name,
            last_name: cp.consultant?.last_name,
            email: cp.consultant?.email,
            role: cp.role,
            allocation_percentage: cp.allocation_percentage,
            start_date: cp.start_date,
            end_date: cp.end_date,
            status: cp.status
          })) || []
      })) || [];

      setProjects(projectsWithMembers);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single project by ID
  const fetchProject = async (id: string): Promise<Project> => {
    setLoading(true);
    setError(null);
    try {
      // First, get the project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      if (!projectData) throw new Error('Project not found');

      // Then get the project members
      const { data: membersData, error: membersError } = await supabase
        .from('consultant_projects')
        .select(`
          *,
          consultant:employees(*)
        `)
        .eq('project_id', id);

      if (membersError) throw membersError;

      // Get leave requests with leave type details (avoid employees relationship to prevent PGRST200)
      const { data: leaveRequestsData, error: leaveRequestsError } = await supabase
        .from('project_leave_requests')
        .select(`
          *,
          leave_type:leave_types!project_leave_requests_leave_type_id_fkey(*)
        `)
        .eq('project_id', id);

      if (leaveRequestsError) throw leaveRequestsError;

      // Get holidays
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('consultant_holidays')
        .select('*')
        .eq('project_id', id);

      if (holidaysError) throw holidaysError;

      // Combine all the data
      return {
        ...projectData,
        members: membersData || [],
        leave_requests: leaveRequestsData || [],
        holidays: holidaysData || []
      };
    } catch (err) {
      console.error(`Error fetching project ${id}:`, err);
      setError('Failed to load project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create a new project
  const createProject = async (projectData: any): Promise<Project> => {
    try {
      // Extract members data from the project data
      const { members = [], ...project } = projectData;

      // Get the current date in ISO format for start_date if not provided
      const currentDate = new Date().toISOString();

      // First, create the project in the projects table
      const { data: projectResult, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: project.name,
          description: project.description,
          status: project.status || 'active',
          client_name: project.client_name,
          start_date: project.start_date || currentDate,
          end_date: project.end_date || null,
          created_at: currentDate,
          updated_at: currentDate
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Then add consultants to the consultant_projects table if there are any
      if (members.length > 0) {
        const consultantAssignments = members.map((member: any) => ({
          consultant_id: member.consultant_id,
          project_id: projectResult.id,
          role: member.role || 'member',
          allocation_percentage: member.allocation_percentage || 100,
          start_date: member.start_date || new Date().toISOString(),
          end_date: member.end_date || null,
          status: 'active',
        }));

        const { error: membersError } = await supabase
          .from('consultant_projects')
          .insert(consultantAssignments);

        if (membersError) throw membersError;
      }

      await fetchProjects();
      return projectResult;
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
      throw err;
    }
  };

  // Update an existing project
  const updateProject = async (id: string, updates: any): Promise<void> => {
    try {
      // Extract members data from the updates
      const { members, ...projectUpdates } = updates;

      // Update the project in the projects table
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          name: projectUpdates.name,
          description: projectUpdates.description,
          status: projectUpdates.status,
          client_name: projectUpdates.client_name,
        })
        .eq('id', id);

      if (projectError) throw projectError;

      // If members are provided, update them in the consultant_projects table
      if (members) {
        // First, remove all existing consultant assignments for this project
        const { error: deleteError } = await supabase
          .from('consultant_projects')
          .delete()
          .eq('project_id', id);

        if (deleteError) throw deleteError;

        // Then add the updated consultant assignments
        if (members.length > 0) {
          const consultantAssignments = members.map((member: any) => ({
            consultant_id: member.consultant_id,
            project_id: id,
            role: member.role || 'member',
            allocation_percentage: member.allocation_percentage || 100,
            start_date: member.start_date || new Date().toISOString(),
            end_date: member.end_date || null,
            status: 'active',
          }));

          const { error: membersError } = await supabase
            .from('consultant_projects')
            .insert(consultantAssignments);

          if (membersError) throw membersError;
        }
      }

      await fetchProjects();
    } catch (err) {
      console.error(`Error updating project ${id}:`, err);
      setError('Failed to update project');
      throw err;
    }
  };

  // Delete a project
  const deleteProject = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      console.error(`Error deleting project ${id}:`, err);
      setError('Failed to delete project');
      throw err;
    }
  };

  // Team Member Management
  const addTeamMember = async (projectId: string, member: Partial<ProjectMember>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_project_members')
        .insert([{ ...member, project_id: projectId }]);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      console.error('Error adding team member:', err);
      setError('Failed to add team member');
      throw err;
    }
  };

  const updateTeamMember = async (projectId: string, memberId: string, updates: Partial<ProjectMember>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_project_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      console.error(`Error updating team member ${memberId}:`, err);
      setError('Failed to update team member');
      throw err;
    }
  };

  const removeTeamMember = async (projectId: string, memberId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await fetchProjects();
    } catch (err) {
      console.error(`Error removing team member ${memberId}:`, err);
      setError('Failed to remove team member');
      throw err;
    }
  };

  const fetchTeamMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const { data, error } = await supabase
        .from('consultant_project_members')
        .select('*, employee:employees(*)')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error fetching team members for project ${projectId}:`, err);
      setError('Failed to load team members');
      throw err;
    }
  };

  // Leave Request Management
  const createLeaveRequest = async (leaveRequest: Partial<ProjectLeaveRequest>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('project_leave_requests')
        .insert([leaveRequest]);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating leave request:', err);
      setError('Failed to create leave request');
      throw err;
    }
  };

  const updateLeaveRequest = async (id: string, updates: Partial<ProjectLeaveRequest>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('project_leave_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error updating leave request ${id}:`, err);
      setError('Failed to update leave request');
      throw err;
    }
  };

  const deleteLeaveRequest = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('project_leave_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error deleting leave request ${id}:`, err);
      setError('Failed to delete leave request');
      throw err;
    }
  };

  const fetchLeaveRequests = async (projectId: string): Promise<ProjectLeaveRequest[]> => {
    try {
      const { data, error } = await supabase
        .from('project_leave_requests')
        .select('*, leave_type:leave_types(*)')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error fetching leave requests for project ${projectId}:`, err);
      setError('Failed to load leave requests');
      throw err;
    }
  };

  // Holiday Management
  const createHoliday = async (holiday: Partial<ProjectHoliday>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_holidays')
        .insert([holiday]);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating holiday:', err);
      setError('Failed to create holiday');
      throw err;
    }
  };

  const updateHoliday = async (id: string, updates: Partial<ProjectHoliday>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_holidays')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error updating holiday ${id}:`, err);
      setError('Failed to update holiday');
      throw err;
    }
  };

  const deleteHoliday = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('consultant_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error deleting holiday ${id}:`, err);
      setError('Failed to delete holiday');
      throw err;
    }
  };

  const fetchHolidays = async (projectId: string): Promise<ProjectHoliday[]> => {
    try {
      const { data, error } = await supabase
        .from('consultant_holidays')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Error fetching holidays for project ${projectId}:`, err);
      setError('Failed to load holidays');
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProjects();
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    projects,
    loading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    fetchTeamMembers,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    fetchLeaveRequests,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    fetchHolidays,
  }), [
    projects,
    loading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    fetchTeamMembers,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    fetchLeaveRequests,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    fetchHolidays,
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
