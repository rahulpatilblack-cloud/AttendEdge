import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Users, Mail, Building, Briefcase, UserPlus, Trash2, Edit, Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import EditEmployeeForm from './EditEmployeeForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCompany } from '@/contexts/CompanyContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active: boolean;
  team_id?: string;
  reporting_manager_id?: string;
  company_id?: string;
}

interface EmployeeListProps {
  onAddEmployee: () => void;
  refreshTrigger?: number;
  title?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  addButtonLabel?: string;
  additionalActions?: React.ReactNode;
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  onAddEmployee,
  refreshTrigger,
  title,
  emptyTitle,
  emptySubtitle,
  addButtonLabel,
  additionalActions,
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique departments and roles for filter options
  const departments = useMemo(() => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  const roles = useMemo(() => {
    const roleSet = new Set(employees.map(emp => emp.role));
    return Array.from(roleSet).sort();
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

      // Department filter
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;

      // Status filter (active/inactive)
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && employee.is_active) ||
        (statusFilter === 'inactive' && !employee.is_active);

      return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, roleFilter, departmentFilter, statusFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, departmentFilter, statusFilter]);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportToCSV = () => {
    if (employees.length === 0) return;

    const headers = ['Name', 'Email', 'Role', 'Department', 'Position', 'Hire Date'];
    
    const csvRows = employees.map(emp => [
      `"${emp.name}"`,
      `"${emp.email}"`,
      `"${emp.role}"`,
      `"${emp.department || ''}"`,
      `"${emp.position || ''}"`,
      `"${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : ''}"`
    ].join(','));

    const csvContent = [
      headers.join(','),
      ...csvRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchEmployees = React.useCallback(async () => {
    if (!currentCompany) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }
    
    console.log('Fetching employees...');
    setIsLoading(true);
    
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      console.log('Employees fetched successfully');
      setEmployees(employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);
  
  // Fetch employees on mount and when refreshTrigger changes
  useEffect(() => {
    const controller = new AbortController();
    
    // Only fetch if we have a current company
    if (currentCompany) {
      fetchEmployees();
    }
    
    return () => {
      controller.abort();
    };
  }, [currentCompany, fetchEmployees, refreshTrigger]);

  const canRemoveEmployee = (employee: Employee) => {
    if (!user) return false;
    if (employee.id === user.id) return false; // Can't remove self
    if (user.role === 'admin' && employee.role === 'super_admin') return false; // Admin can't remove super admin
    if (user.role === 'admin' && employee.role === 'admin') return false; // Admin can't remove other admins
    return ['admin', 'super_admin'].includes(user.role); // Only admins and super admins can remove
  };

  const canEditEmployee = (employee: Employee) => {
    if (!user) return false;
    if (employee.id === user.id) return false; // Can't edit self (should have a separate profile edit)
    if (user.role === 'admin' && employee.role === 'super_admin') return false; // Admin can't edit super admin
    return ['admin', 'super_admin'].includes(user.role); // Only admins and super admins can edit
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee || !canRemoveEmployee(employee)) {
      toast({
        title: "Error",
        description: "You don't have permission to remove this employee",
        variant: "destructive"
      });
      return;
    }

    setRemovingId(employeeId);
    
    try {
      console.log('Attempting to delete employee:', employeeId);
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      let errorMessage = 'Failed to delete employee';
      let responseData;
      
      try {
        // Only try to parse as JSON if there's content
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        console.error('Error response:', response.status, response.statusText, responseData);
        throw new Error(responseData.error || `Server responded with status ${response.status}`);
      }

      toast({
        title: "Success",
        description: responseData.message || `${employeeName} has been removed successfully`,
      });

      // Refresh the list
      fetchEmployees();
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while removing the employee",
        variant: "destructive"
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleEditSuccess = () => {
    setEditingEmployee(null);
    fetchEmployees();
  };

  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger, currentCompany]);

  const canAddEmployee = user && ['admin', 'super_admin'].includes(user.role);

  const headingTitle = title || `Employees (${employees.length})`;
  const emptyStateTitle = emptyTitle || 'No employees found';
  const emptyStateSubtitle = emptySubtitle || 'Get started by adding your first employee';
  const addLabel = addButtonLabel || 'Add Employee';

  if (!currentCompany) {
    return (
      <div className="p-8 text-center text-gray-500">
        No company selected. Please select a company to view employees.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (editingEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={() => setEditingEmployee(null)}
            className="p-2"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-bold">Edit Employee</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <EditEmployeeForm 
              employee={editingEmployee}
              onSuccess={handleEditSuccess} 
              onCancel={() => setEditingEmployee(null)} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions Palette */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={employees.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            {additionalActions}
            {canAddEmployee && (
              <Button 
                onClick={onAddEmployee}
                variant="gradient"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {addLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consultants List Palette */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">{headingTitle}</h2>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search consultants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            {(searchTerm || roleFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all') && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-800">
                  {filteredEmployees.length} of {employees.length} consultants match filters
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('all');
                    setDepartmentFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {paginatedEmployees.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
          <p className="text-gray-500 mb-3">{emptyStateSubtitle}</p>
          {canAddEmployee && (
            <Button 
              onClick={onAddEmployee}
              variant="gradient"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {addLabel}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedEmployees.map((employee) => (
            <Card key={employee.id} className="border-0 shadow-lg card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{toTitleCase(employee.name)}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={employee.role === 'admin' || employee.role === 'super_admin' ? 'default' : 'secondary'}>
                      {employee.role.replace('_', ' ')}
                    </Badge>
                    <div className="flex space-x-1">
                      {canEditEmployee(employee) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setEditingEmployee(employee)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                      {canRemoveEmployee(employee) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={removingId === employee.id}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {toTitleCase(employee.name)}? This action will deactivate their account and they will no longer be able to access system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-3 h-3" />
                  <span className="text-sm">{employee.email}</span>
                </div>
                
                {employee.department && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Building className="w-3 h-3" />
                    <span className="text-sm">{employee.department}</span>
                  </div>
                )}
                
                {employee.position && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Briefcase className="w-3 h-3" />
                    <span className="text-sm">{employee.position}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} • Showing {paginatedEmployees.length} of {filteredEmployees.length} consultants
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
