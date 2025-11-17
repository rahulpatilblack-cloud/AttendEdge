import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Building, 
  Crown, 
  UserCheck, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  RefreshCw,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  MapPin,
  UserMinus
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';

interface Team {
  id: string;
  name: string;
  description: string;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  member_count?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  team_id: string | null;
  reporting_manager_id: string | null;
  is_active: boolean;
  team?: {
    id: string;
    name: string;
  };
  reporting_manager?: {
    id: string;
    name: string;
  };
}

const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');
  
  // Team management states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    manager_id: ''
  });

  // Employee assignment states
  const [showAssignEmployee, setShowAssignEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    team_id: '',
    reporting_manager_id: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    team: 'all',
    role: 'all',
    department: 'all'
  });

  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [selectedAddMember, setSelectedAddMember] = useState<string>('');

  // Add state to track selected stats card
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  const canManageTeams = ['admin', 'super_admin'].includes(user?.role || '');

  useEffect(() => {
    if (currentCompany || user?.role === 'super_admin') {
      fetchTeams();
      fetchEmployees();
    }
  }, [currentCompany, user?.role]);

  const fetchTeams = async () => {
    if (!currentCompany && user?.role !== 'super_admin') return;

    // Build query based on user role
    let query = supabase
      .from('teams')
      .select('*')
      .eq('is_active', true);

    // If user is not super admin, restrict to their company
    if (user?.role !== 'super_admin' && currentCompany) {
      query = query.eq('company_id', currentCompany.id);
    }

    const { data: teamsData, error: teamsError } = await query;

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive"
      });
      return;
    }

    // Then fetch manager profiles for teams that have managers
    const managerIds = teamsData
      ?.filter(team => team.manager_id)
      .map(team => team.manager_id)
      .filter(Boolean) || [];

    let managerProfiles = [];
    if (managerIds.length > 0) {
      const { data: managerData, error: managerError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', managerIds);

      if (managerError) {
        console.error('Error fetching manager profiles:', managerError);
      } else {
        managerProfiles = managerData || [];
      }
    }

    // Combine teams with manager data
    const teamsWithManagers = teamsData?.map(team => ({
      ...team,
      manager: managerProfiles.find(manager => manager.id === team.manager_id) || null
    })) || [];

    setTeams(teamsWithManagers);
  };

  const fetchEmployees = async () => {
    if (!currentCompany && user?.role !== 'super_admin') return;

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, role, department, position, team_id, reporting_manager_id, is_active')
      .eq('company_id', currentCompany.id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setEmployees(employees);
    setIsLoading(false);
  };

  const createTeam = async () => {
    if ((!currentCompany && user?.role !== 'super_admin') || !newTeam.name.trim()) return;

    const teamData: any = {
      name: newTeam.name,
      description: newTeam.description,
      manager_id: newTeam.manager_id || null
    };

    // Set company_id based on user role
    if (user?.role === 'super_admin' && !currentCompany) {
      // For super admin without company, we need to get the company from the manager
      if (newTeam.manager_id) {
        const { data: managerProfile } = await supabase
          .from('employees')
          .select('company_id')
          .eq('id', newTeam.manager_id)
          .single();
        
        if (managerProfile?.company_id) {
          teamData.company_id = managerProfile.company_id;
        } else {
          toast({
            title: "Error",
            description: "Manager must belong to a company",
            variant: "destructive"
          });
          return;
        }
      } else {
        toast({
          title: "Error",
          description: "Please select a manager or company for the team",
          variant: "destructive"
        });
        return;
      }
    } else if (currentCompany) {
      teamData.company_id = currentCompany.id;
    }

    const { error } = await supabase
      .from('teams')
      .insert(teamData);

    if (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Team created successfully"
      });
      setShowCreateTeam(false);
      setNewTeam({ name: '', description: '', manager_id: '' });
      fetchTeams();
    }
  };

  const updateTeam = async () => {
    if (!selectedTeam) return;

    const { error } = await supabase
      .from('teams')
      .update({
        name: selectedTeam.name,
        description: selectedTeam.description,
        manager_id: selectedTeam.manager_id
      })
      .eq('id', selectedTeam.id);

    if (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Team updated successfully"
      });
      setShowEditTeam(false);
      setSelectedTeam(null);
      fetchTeams();
    }
  };

  const assignEmployee = async () => {
    if (!selectedEmployee) return;

    const teamIdToSave = assignmentData.team_id === 'no_team' ? null : assignmentData.team_id;
    const managerIdToSave = assignmentData.reporting_manager_id === 'no_manager' ? null : assignmentData.reporting_manager_id;

    const { error } = await supabase
      .from('employees')
      .update({
        team_id: teamIdToSave,
        reporting_manager_id: managerIdToSave
      })
      .eq('id', selectedEmployee.id);

    if (error) {
      console.error('Error assigning employee:', error);
      toast({
        title: "Error",
        description: "Failed to assign employee",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Employee assigned successfully"
      });
      setShowAssignEmployee(false);
      setSelectedEmployee(null);
      setAssignmentData({ team_id: '', reporting_manager_id: '' });
      fetchEmployees();
    }
  };

  const getReportingManagers = () => {
    return employees.filter(emp => emp.role === 'reporting_manager');
  };

  const getTeamMembers = (teamId: string) => {
    return employees.filter(emp => emp.team_id === teamId);
  };

  const getEmployeesByManager = (managerId: string) => {
    return employees.filter(emp => emp.reporting_manager_id === managerId);
  };

  // Filter employees based on filters
  const filteredEmployees = employees.filter(emp => {
    let match = true;
    if (filters.search) match = match && emp.name.toLowerCase().includes(filters.search.toLowerCase());
    if (filters.team !== 'all') match = match && emp.team_id === filters.team;
    if (filters.role !== 'all') match = match && emp.role === filters.role;
    if (filters.department !== 'all') match = match && emp.department === filters.department;
    return match;
  });

  // Only count teams with members
  const teamsWithMembers = teams.filter(team => getTeamMembers(team.id).length > 0);

  // Handlers for card clicks
  const handleStatClick = (stat: string) => {
    setSelectedStat(stat === selectedStat ? null : stat);
  };

  // Filtered data for each stat
  const filteredTeams = selectedStat === 'teams' ? teamsWithMembers : teamsWithMembers;
  const statFilteredEmployees = selectedStat === 'employees' ? employees : employees;
  const filteredManagers = selectedStat === 'managers' ? getReportingManagers() : getReportingManagers();
  const filteredUnassigned = selectedStat === 'unassigned' ? employees.filter(emp => !emp.team_id || !emp.reporting_manager_id) : employees.filter(emp => !emp.team_id || !emp.reporting_manager_id);

  const deleteTeam = async (teamId: string) => {
    setActionLoading(true);
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    setActionLoading(false);
    setDeletingTeamId(null);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete team', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Team deleted' });
      fetchTeams();
      fetchEmployees();
    }
  };

  const addMemberToTeam = async (teamId: string, employeeId: string) => {
    const { error } = await supabase.from('employees').update({ team_id: teamId }).eq('id', employeeId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to add member', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Member added' });
      fetchEmployees();
      setSelectedAddMember('');
    }
  };

  const removeMemberFromTeam = async (employeeId: string) => {
    setActionLoading(true);
    const { error } = await supabase.from('employees').update({ team_id: null }).eq('id', employeeId);
    setActionLoading(false);
    setRemovingMemberId(null);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Member removed' });
      fetchEmployees();
    }
  };

  if (!currentCompany) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
        <p className="text-gray-600">Unable to load company information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Managing teams and reporting structure for 
            <span className="font-medium text-primary flex items-center gap-1">
              <Building className="w-4 h-4" />
              {currentCompany.name}
            </span>
          </p>
        </div>
        <Button onClick={() => { fetchTeams(); fetchEmployees(); }} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`${themeClass} card-theme border-l-4 border-primary cursor-pointer ${selectedStat === 'teams' ? 'ring-2 ring-primary' : ''}`} onClick={() => handleStatClick('teams')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Teams</p>
                <p className="font-bold text-primary">{teamsWithMembers.length}</p>
              </div>
              <Users className="w-10 h-10 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${themeClass} card-theme border-l-4 border-green-500 cursor-pointer ${selectedStat === 'employees' ? 'ring-2 ring-green-400' : ''}`} onClick={() => handleStatClick('employees')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-green-600">{employees.length}</p>
              </div>
              <UserPlus className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${themeClass} card-theme border-l-4 border-purple-500 cursor-pointer ${selectedStat === 'managers' ? 'ring-2 ring-purple-400' : ''}`} onClick={() => handleStatClick('managers')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reporting Managers</p>
                <p className="text-2xl font-bold text-purple-600">{getReportingManagers().length}</p>
              </div>
              <Crown className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${themeClass} card-theme border-l-4 border-orange-500 cursor-pointer ${selectedStat === 'unassigned' ? 'ring-2 ring-orange-400' : ''}`} onClick={() => handleStatClick('unassigned')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-2xl font-bold text-orange-600">{employees.filter(emp => !emp.team_id || !emp.reporting_manager_id).length}</p>
              </div>
              <UserCheck className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Employees Card */}
      <Card className={`${themeClass} card-theme mb-6 border-l-4 border-orange-500`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-orange-600" />
            Unassigned Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.filter(emp => !emp.team_id).length === 0 && (
              <p className="text-center text-gray-500 py-4">All employees are assigned to teams</p>
            )}
            {employees.filter(emp => !emp.team_id).map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-gray-600">{emp.department} • {emp.position}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={''} onValueChange={teamId => addMemberToTeam(teamId, emp.id)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Assign to team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="employees">Employee Assignments</TabsTrigger>
          <TabsTrigger value="hierarchy">Team Hierarchy</TabsTrigger>
        </TabsList>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Teams Overview</h2>
            <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Team Name</Label>
                    <Input
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                      placeholder="Enter team description"
                    />
                  </div>
                  <div>
                    <Label>Team Manager</Label>
                    <Select value={newTeam.manager_id} onValueChange={(value) => setNewTeam({...newTeam, manager_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_manager">No Manager</SelectItem>
                        {getReportingManagers().map(manager => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name} ({manager.department})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createTeam} className="flex-1">Create Team</Button>
                    <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Card key={team.id} className={`${themeClass} card-theme hover:shadow-lg transition-shadow`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      {team.name}
                    </span>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Team</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingTeamId(team.id)} disabled={actionLoading}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Team</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{team.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Manager:</span>
                      <span className="text-sm text-gray-600">
                        {team.manager ? team.manager.name : 'Not assigned'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Members:</span>
                      <Badge variant="secondary">
                        {getTeamMembers(team.id).length} employees
                      </Badge>
                    </div>
                    
                    <div className="mt-3">
                      <Label>Add Member</Label>
                      <div className="flex gap-2 items-center">
                        <Select value={addMemberTeamId === team.id ? selectedAddMember : ''} onValueChange={val => { setAddMemberTeamId(team.id); setSelectedAddMember(val); }}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.filter(emp => !emp.team_id).map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.position})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => addMemberToTeam(team.id, selectedAddMember)} disabled={!selectedAddMember || addMemberTeamId !== team.id || actionLoading}>
                          {actionLoading && addMemberTeamId === team.id ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-2">Team Members:</h4>
                    <div className="space-y-1">
                      {getTeamMembers(team.id).map(member => (
                        <div key={member.id} className="flex items-center justify-between text-xs text-gray-600">
                          <span>{member.name} - {member.position}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => setRemovingMemberId(member.id)} disabled={actionLoading} className="text-gray-400 hover:text-red-500 transition-colors">
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove from Team</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                      {getTeamMembers(team.id).length === 0 && (
                        <div className="text-xs text-gray-500">No members assigned</div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <Dialog open={deletingTeamId === team.id} onOpenChange={() => setDeletingTeamId(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Team</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Are you sure you want to delete this team? This action cannot be undone.<br/>All members will be unassigned from this team.</p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setDeletingTeamId(null)} disabled={actionLoading}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteTeam(team.id)} disabled={actionLoading}>
                          {actionLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={!!removingMemberId} onOpenChange={() => setRemovingMemberId(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Are you sure you want to remove this member from the team?</p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setRemovingMemberId(null)} disabled={actionLoading}>Cancel</Button>
                        <Button variant="destructive" onClick={() => removeMemberFromTeam(removingMemberId!)} disabled={actionLoading}>
                          {actionLoading ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Employee Assignments Tab */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Employee Assignments</h2>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Search</Label>
                  <Input
                    placeholder="Search employees..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Team</Label>
                  <Select value={filters.team} onValueChange={(value) => setFilters({...filters, team: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="reporting_manager">Reporting Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {Array.from(new Set(employees.map(emp => emp.department || 'unknown'))).map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-medium">Employee</th>
                      <th className="text-left p-4 font-medium">Department</th>
                      <th className="text-left p-4 font-medium">Position</th>
                      <th className="text-left p-4 font-medium">Team</th>
                      <th className="text-left p-4 font-medium">Reporting Manager</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statFilteredEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-gray-600">{employee.email}</div>
                          </div>
                        </td>
                        <td className="p-4">{employee.department}</td>
                        <td className="p-4">
                          <Badge variant={
                            employee.role === 'admin' ? 'destructive' :
                            employee.role === 'reporting_manager' ? 'default' : 'secondary'
                          }>
                            {employee.position}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {employee.team ? employee.team.name : 'Unassigned'}
                        </td>
                        <td className="p-4">
                          {employee.reporting_manager ? employee.reporting_manager.name : 'Unassigned'}
                        </td>
                        <td className="p-4">
                          <Dialog open={showAssignEmployee && selectedEmployee?.id === employee.id} onOpenChange={setShowAssignEmployee}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setAssignmentData({
                                    team_id: employee.team_id || '',
                                    reporting_manager_id: employee.reporting_manager_id || ''
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Assign
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Assign Employee</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Employee</Label>
                                  <Input value={selectedEmployee?.name || ''} disabled />
                                </div>
                                <div>
                                  <Label>Team</Label>
                                  <Select value={assignmentData.team_id} onValueChange={(value) => setAssignmentData({...assignmentData, team_id: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="no_team">No Team</SelectItem>
                                      {teams.map(team => (
                                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Reporting Manager</Label>
                                  <Select value={assignmentData.reporting_manager_id} onValueChange={(value) => setAssignmentData({...assignmentData, reporting_manager_id: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a reporting manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="no_manager">No Manager</SelectItem>
                                      {getReportingManagers().map(manager => (
                                        <SelectItem key={manager.id} value={manager.id}>
                                          {manager.name} ({manager.department})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={assignEmployee} className="flex-1">Assign</Button>
                                  <Button variant="outline" onClick={() => setShowAssignEmployee(false)}>Cancel</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Hierarchy Tab */}
        <TabsContent value="hierarchy" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Hierarchy</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reporting Managers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  Reporting Managers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredManagers.map(manager => (
                    <div key={manager.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{manager.name}</h4>
                          <p className="text-sm text-gray-600">{manager.department} • {manager.position}</p>
                        </div>
                        <Badge variant="default">{manager.position}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Team Members ({getEmployeesByManager(manager.id).length}):</p>
                        {getEmployeesByManager(manager.id).map(emp => (
                          <div key={emp.id} className="flex items-center justify-between text-sm">
                            <span>{emp.name}</span>
                            <span className="text-gray-500">{emp.position}</span>
                          </div>
                        ))}
                        {getEmployeesByManager(manager.id).length === 0 && (
                          <p className="text-sm text-gray-500">No team members assigned</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unassigned Employees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  Unassigned Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredUnassigned.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-gray-600">{emp.department} • {emp.position}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{emp.position}</Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {!emp.team_id && 'No Team'}
                          {!emp.team_id && !emp.reporting_manager_id && ' • '}
                          {!emp.reporting_manager_id && 'No Manager'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUnassigned.length === 0 && (
                    <p className="text-center text-gray-500 py-8">All employees are properly assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManagement; 