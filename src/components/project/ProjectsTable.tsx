// src/components/project/ProjectsTable.tsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/date-utils';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { debounce } from 'lodash';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Printer, SlidersHorizontal, Columns, List, Grid } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { exportToCSV, exportToExcel } from '@/lib/export-utils';
import { toast } from '@/components/ui/use-toast';

const PAGE_SIZE = 20;

// ... [Previous type definitions and imports]

export function ProjectsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', direction: 'desc' });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    client_name: true,
    end_client: true,
    timeline: true,
    status: true,
    actions: true
  });

  // ... [Previous fetchProjects function]

  const { data, isLoading, isError } = useQuery(
    ['projects', { page, search, status: statusFilter, dateRange, sortConfig }],
    () => fetchProjects({
      page,
      search,
      status: statusFilter,
      dateRange,
      sortField: sortConfig.field,
      sortDirection: sortConfig.direction
    }),
    { keepPreviousData: true }
  );

  // ... [Previous handlers]

  const handleBulkAction = async (action: 'delete' | 'status', status?: string) => {
    if (selectedRows.size === 0) return;

    try {
      if (action === 'delete') {
        await supabase
          .from('projects')
          .delete()
          .in('id', Array.from(selectedRows));
      } else if (action === 'status' && status) {
        await supabase
          .from('projects')
          .update({ status })
          .in('id', Array.from(selectedRows));
      }
      
      queryClient.invalidateQueries(['projects']);
      setSelectedRows(new Set());
      toast({
        title: 'Success',
        description: `Updated ${selectedRows.size} projects`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update projects',
        variant: 'destructive',
      });
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (!data?.data) return;
    
    const exportData = data.data.map(project => ({
      'Project Name': project.name,
      'Client': project.client_name,
      'End Client': project.end_client || '-',
      'Start Date': formatDate(project.start_date),
      'End Date': project.end_date ? formatDate(project.end_date) : '-',
      'Status': project.status,
      'Description': project.description || '-',
      'Created At': formatDate(project.created_at)
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'projects');
    } else {
      exportToExcel(exportData, 'projects');
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data?.data?.map(project => project.id) || []));
    } else {
      setSelectedRows(new Set());
    }
  };

  // ... [Previous JSX with added features]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search projects..."
            className="max-w-sm"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusVariantMap).map(([status]) => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2">
                {Object.entries(columnVisibility).map(([key, visible]) => (
                  <div key={key} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                    <Checkbox
                      id={`col-${key}`}
                      checked={visible}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, [key]: !!checked }))
                      }
                    />
                    <label
                      htmlFor={`col-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {key.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
            {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>Create Project</Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-accent rounded-md">
          <span className="text-sm text-muted-foreground">
            {selectedRows.size} selected
          </span>
          <Select onValueChange={(value) => handleBulkAction('status', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Change Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusVariantMap).map(([status]) => (
                <SelectItem key={status} value={status}>
                  Set as {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleBulkAction('delete')}
          >
            Delete
          </Button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedRows.size > 0 && selectedRows.size === data?.data?.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {columnVisibility.name && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('name')}
                  >
                    Project Name
                    {sortConfig.field === 'name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </TableHead>
                )}
                {columnVisibility.client_name && (
                  <TableHead>Client</TableHead>
                )}
                {columnVisibility.end_client && (
                  <TableHead>End Client</TableHead>
                )}
                {columnVisibility.timeline && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('start_date')}
                  >
                    Timeline
                    {sortConfig.field === 'start_date' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </TableHead>
                )}
                {columnVisibility.status && (
                  <TableHead>Status</TableHead>
                )}
                {columnVisibility.actions && (
                  <TableHead>Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[20px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  </TableRow>
                ))
              ) : (
                data?.data?.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(project.id)}
                        onCheckedChange={(checked) => {
                          const newSelection = new Set(selectedRows);
                          if (checked) {
                            newSelection.add(project.id);
                          } else {
                            newSelection.delete(project.id);
                          }
                          setSelectedRows(newSelection);
                        }}
                      />
                    </TableCell>
                    {columnVisibility.name && (
                      <TableCell className="font-medium">{project.name}</TableCell>
                    )}
                    {columnVisibility.client_name && (
                      <TableCell>{project.client_name}</TableCell>
                    )}
                    {columnVisibility.end_client && (
                      <TableCell>{project.end_client || '-'}</TableCell>
                    )}
                    {columnVisibility.timeline && (
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(project.start_date)}</span>
                          {project.end_date && (
                            <span className="text-muted-foreground text-sm">
                              to {formatDate(project.end_date)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.status && (
                      <TableCell>
                        <Badge variant={statusVariantMap[project.status]}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))
          ) : (
            data?.data?.map((project) => (
              <div key={project.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{project.name}</h3>
                  <Badge variant={statusVariantMap[project.status]}>
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
                {project.end_client && (
                  <p className="text-sm">End Client: {project.end_client}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  {formatDate(project.start_date)} - {project.end_date ? formatDate(project.end_date) : 'Present'}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm">View</Button>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, data?.count || 0)} of {data?.count || 0} projects
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!data?.data?.length || data.data.length < PAGE_SIZE}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}