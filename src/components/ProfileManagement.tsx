import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Users, UserCheck, UserX, Building, BarChart2, Loader2, RefreshCw, Eye, Pencil } from 'lucide-react';
import Profile from './Profile';
import { Employee } from '@/types/employee';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PROFILE_ROLES = ['admin', 'super_admin'];

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  departments: Record<string, number>;
}

const ProfileManagement: React.FC = () => {
  const { user } = useAuth();
  const { employees = [], fetchEmployees, isLoading: employeesLoading, error: employeesError } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle errors from useEmployees
  useEffect(() => {
    if (employeesError) {
      console.error('Employees error:', employeesError);
      setError('Failed to load employees. Please try again.');
    } else {
      setError(null);
    }
  }, [employeesError]);

  // Call fetchEmployees only once on mount to avoid infinite loop
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Calculate statistics with error handling
  const stats = useMemo<EmployeeStats>(() => {
    try {
      return employees?.reduce((acc, emp) => {
        acc.total++;
        if (emp.is_active) acc.active++;
        else acc.inactive++;
        
        const dept = emp.department || 'Unassigned';
        acc.departments[dept] = (acc.departments[dept] || 0) + 1;
        
        return acc;
      }, { total: 0, active: 0, inactive: 0, departments: {} } as EmployeeStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { total: 0, active: 0, inactive: 0, departments: {} };
    }
  }, [employees]);
  
  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && emp.is_active) || 
        (statusFilter === 'inactive' && !emp.is_active);
      
      const matchesDepartment = 
        departmentFilter === 'all' || 
        emp.department === departmentFilter ||
        (!emp.department && departmentFilter === 'Unassigned');
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, searchTerm, statusFilter, departmentFilter]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEmployees();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only allow admin/super_admin
  if (!user) {
    return (
      <div className="p-8 text-center text-lg text-yellow-600">Please log in to access this page</div>
    );
  }

  if (!PROFILE_ROLES.includes(user.role)) {
    return (
      <div className="p-8 text-center text-lg text-red-500">
        Access Denied: This section is only available to administrators.
      </div>
    );
  }
  
  // Show error if employees failed to load
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <Button 
          onClick={() => {
            setError(null);
            fetchEmployees();
          }} 
          variant="outline"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Profile Management</h2>
          <p className="text-muted-foreground">Manage and update employee profiles</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">across all departments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="flex items-center gap-2">
              <Progress value={(stats.active / Math.max(1, stats.total)) * 100} className="h-2 w-full" />
              <span className="text-xs text-muted-foreground">
                {Math.round((stats.active / Math.max(1, stats.total)) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="w-5 h-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inactive === 0 ? 'All employees active' : 'Requires attention'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.departments).length}</div>
            <p className="text-xs text-muted-foreground">
              {Object.entries(stats.departments)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([dept, count]) => `${dept} (${count})`)
                .join(', ')}
              {Object.keys(stats.departments).length > 2 ? '...' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2 opacity-50" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={departmentFilter} 
                onValueChange={setDepartmentFilter}
                disabled={Object.keys(stats.departments).length === 0}
              >
                <SelectTrigger className="w-[180px]">
                  <Building className="w-4 h-4 mr-2 opacity-50" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.keys(stats.departments)
                    .sort((a, b) => a.localeCompare(b))
                    .map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept} ({stats.departments[dept]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {employeesLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading employees...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{filteredEmployees.length}</span> of {employees.length} employees
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredEmployees.map(emp => (
                  <Card key={emp.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{emp.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{emp.designation || 'No designation'}</p>
                        </div>
                        <Badge variant={emp.is_active ? 'default' : 'destructive'} className="ml-2">
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <p className="text-muted-foreground">{emp.email}</p>
                        <p className="font-medium">{emp.department || 'No department'}</p>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { 
                                  setSelectedEmployeeId(emp.id); 
                                  setViewDialogOpen(true); 
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Profile</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { 
                                  setSelectedEmployeeId(emp.id); 
                                  setEditDialogOpen(true); 
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Profile</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredEmployees.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No employees found matching your criteria</p>
                    <Button 
                      variant="ghost" 
                      className="mt-2"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setDepartmentFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4">
              <Profile employeeId={selectedEmployeeId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Employee Profile</DialogTitle>
          </DialogHeader>
          {selectedEmployeeId && (
            <div className="mt-4">
              <Profile 
                employeeId={selectedEmployeeId} 
                readOnly={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileManagement;
