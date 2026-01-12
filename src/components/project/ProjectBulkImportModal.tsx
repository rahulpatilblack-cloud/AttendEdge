import React, { useState, useCallback, useMemo, Component, ErrorInfo, ReactNode } from 'react';

// Simple error boundary fallback in case the package fails to load
class ErrorBoundary extends Component<{ 
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode; 
}, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error in ProjectBulkImportModal:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.resetError);
    }
    return this.props.children;
  }
}

// Try to use the package's ErrorBoundary if available, otherwise use our fallback
let ErrorBoundaryComponent: React.ComponentType<{
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}>;

try {
  const { ErrorBoundary: PackageErrorBoundary } = require('react-error-boundary');
  ErrorBoundaryComponent = PackageErrorBoundary;
} catch (e) {
  console.warn('Using fallback ErrorBoundary');
  ErrorBoundaryComponent = ErrorBoundary;
}
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, FileText, Upload, X, Loader2, AlertTriangle, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { useProjects } from '@/contexts/ProjectContext';

// Helper function to add delay between imports
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h3 className="text-red-800 font-medium">Something went wrong</h3>
      <pre className="text-sm text-red-700 mt-2 whitespace-pre-wrap">{error.message}</pre>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        className="mt-4"
      >
        Try again
      </Button>
    </div>
  );
};

interface ProjectBulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Fields that match ProjectForm schema
const PROJECT_FIELDS = [
  // Required fields
  { id: 'name', label: 'Project Name', required: true },
  { id: 'client_name', label: 'Client Name', required: true },
  { id: 'end_client', label: 'End Client', required: true },
  { id: 'start_date', label: 'Start Date', required: true },
  { 
    id: 'status', 
    label: 'Status', 
    required: true,
    options: ['active', 'on_hold', 'completed', 'cancelled']
  },
  // Optional fields
  { id: 'description', label: 'Description', required: false },
  { id: 'end_date', label: 'End Date', required: false },
  { 
    id: 'assigned_consultant', 
    label: 'Assigned Consultant', 
    required: false,
    type: 'string',
    description: 'Name or email of the consultant'
  }
  // Note: allocation_percentage is now handled separately with a fixed value of 100
];

const ProjectBulkImportModal: React.FC<ProjectBulkImportModalProps> = ({
  open,
  onOpenChange,
  onImportComplete,
}: ProjectBulkImportModalProps) => {
  const { currentCompany } = useCompany();
  const { createProject } = useProjects();
  
  // Use the existing Supabase client
  
  // State declarations
  const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    total: number;
    completed: number;
    errors: Array<{ row: number; error: string }>;
    records: Array<{
      index: number;
      [key: string]: any;
    }>;
  }>({
    success: 0,
    failed: 0,
    total: 0,
    completed: 0,
    errors: [],
    records: [],
  });

  // Reset the modal state
  const resetState = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setImportResults({
      success: 0,
      failed: 0,
      total: 0,
      completed: 0,
      errors: [],
      records: [],
    });
    setStep('upload');
  }, []);

  // Handle file drop/selection
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a valid file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && 
        !['.csv', '.xls', '.xlsx'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file',
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('File read result is empty');
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No sheets found in the file');
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('The file is empty or contains no data');
        }

        // Process headers
        const headerRow = jsonData[0];
        if (!Array.isArray(headerRow) || headerRow.length === 0) {
          throw new Error('No headers found in the first row');
        }

        let headers = headerRow
          .map((h: any, i: number) => {
            if (h === null || h === undefined || h === '') {
              return `Column_${i + 1}`;
            }
            const trimmed = String(h).trim();
            return trimmed || `Column_${i + 1}`;
          })
          .filter((h: string) => h !== '');

        // Ensure uniqueness
        const seenHeaders = new Map<string, number>();
        headers = headers.map((h: string) => {
          const count = seenHeaders.get(h) || 0;
          seenHeaders.set(h, count + 1);
          return count > 0 ? `${h}_${count + 1}` : h;
        });

        if (headers.length === 0) {
          throw new Error('No valid headers found. Please ensure the first row contains column names.');
        }

        // Process data rows (skip header row)
        const dataRows = jsonData.slice(1);
        const records = dataRows
          .map((row: any[], index: number) => {
            if (!Array.isArray(row)) return null;

            const record: any = {
              __rowNum__: index + 2, // +2 for 1-based index and header row
              __originalRow__: row,
            };

            headers.forEach((header: string, colIndex: number) => {
              const cellValue = row[colIndex];
              record[header] = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : '';
            });

            return record;
          })
          .filter((record: any) => record); // Remove nulls

        setHeaders(headers);
        setRecords(records);
        setStep('mapping');

        // Auto-map fields based on exact matches first
        const autoMap: Record<string, string> = {};
        const lowerHeaders = headers.map(h => h.toLowerCase());
        
        PROJECT_FIELDS.forEach(field => {
          // Try exact match first
          const exactMatchIndex = lowerHeaders.findIndex(h => h === field.id.toLowerCase());
          if (exactMatchIndex !== -1) {
            autoMap[field.id] = headers[exactMatchIndex];
            return;
          }
          
          // Try label match
          const labelMatchIndex = lowerHeaders.findIndex(h => 
            h === field.label.toLowerCase()
          );
          if (labelMatchIndex !== -1) {
            autoMap[field.id] = headers[labelMatchIndex];
          }
        });
        
        setMapping(autoMap);

      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: 'Error processing file',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'destructive',
        });
        resetState();
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Could not read the file. Please try again.',
        variant: 'destructive',
      });
      resetState();
    };

    reader.readAsArrayBuffer(file);
  }, [resetState]);

  // Handle mapping changes
  const handleMappingChange = (field: string, value: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      if (value === '_unmapped') {
        delete newMapping[field];
      } else if (value && value !== '') {
        newMapping[field] = value;
      } else {
        delete newMapping[field];
      }
      return newMapping;
    });
  };

  // Validate mappings before proceeding to review
  const validateMappings = () => {
    const missingFields = PROJECT_FIELDS
      .filter(field => field.required && !mapping[field.id])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please map all required fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    
    // Validate status values if status field is mapped
    if (mapping.status) {
      const statusField = PROJECT_FIELDS.find(f => f.id === 'status');
      if (statusField?.options) {
        const invalidStatusRows: number[] = [];
        
        records.forEach((record, index) => {
          const statusValue = record[mapping.status]?.toLowerCase();
          if (statusValue && !statusField.options.includes(statusValue)) {
            invalidStatusRows.push(index + 2); // +2 for header row and 1-based index
          }
        });
        
        if (invalidStatusRows.length > 0) {
          toast({
            title: 'Invalid status values',
            description: `Rows ${invalidStatusRows.join(', ')}: Status must be one of: ${statusField.options.join(', ')}`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }
    
    return true;
  };

  // Proceed to review step
  const handleProceedToReview = () => {
    if (validateMappings()) {
      setStep('review');
    }
  };

  // Import projects
  const handleImport = async () => {
    try {
      if (!validateMappings()) return;
    
    setStep('importing');
    
    const results = {
      success: 0,
      failed: 0,
      total: records.length,
      completed: 0,
      errors: [] as Array<{ row: number; error: string }>,
      records: records.map((record, index) => ({
        index,
        status: 'pending' as const,
      })),
    };
    
    // Fetch all users for consultant lookup
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, email');
    
    const usersMap = new Map();
    allUsers?.forEach(user => {
      if (user.email) usersMap.set(user.email.toLowerCase(), user.id);
      if (user.name) usersMap.set(user.name.toLowerCase(), user.id);
    });

    setImportResults(results);

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordIndex = results.records.findIndex(r => r.index === i);
      
      if (recordIndex === -1) continue;

      // Update status to importing
      results.records[recordIndex].status = 'importing';
      setImportResults({ ...results });

      try {
        // Map record fields to project data
        const projectData: any = {};
        
        // Map all fields from the mapping
        Object.entries(mapping).forEach(([field, header]) => {
          if (header && record[header] !== undefined) {
            const fieldConfig = PROJECT_FIELDS.find(f => f.id === field);
            const value = record[header];
            
            // Skip if value is empty and field is not required
            if (value === '' && !fieldConfig?.required) {
              return;
            }
            
            // Handle assigned_consultant field
            if (field === 'assigned_consultant' && value) {
              const consultantId = usersMap.get(value.toLowerCase());
              if (consultantId) {
                // Store consultant ID separately to use later for consultant_projects
                projectData._assigned_consultant_id = consultantId;
              }
              return;
            }
            
            // For all other fields, just assign the value
            projectData[field] = value;
          }
        });

        // Ensure status is in the correct format
        if (projectData.status) {
          projectData.status = String(projectData.status).toLowerCase().trim();
        }
        
        // Set default status if not provided or invalid
        if (!projectData.status || !['active', 'on_hold', 'completed', 'cancelled'].includes(projectData.status)) {
          projectData.status = 'active';
        }

        // Project name is required, no auto-generation needed

        // Convert string dates to ISO format
        if (projectData.start_date && typeof projectData.start_date === 'string') {
          const startDate = new Date(projectData.start_date);
          if (!isNaN(startDate.getTime())) {
            projectData.start_date = startDate.toISOString().split('T')[0];
          }
        }

        if (projectData.end_date && typeof projectData.end_date === 'string') {
          const endDate = new Date(projectData.end_date);
          if (!isNaN(endDate.getTime())) {
            projectData.end_date = endDate.toISOString().split('T')[0];
          } else {
            projectData.end_date = null;
          }
        } else {
          projectData.end_date = null;
        }

        // Check if project exists (by name and client_name)
        const { data: existingProject } = await supabase
          .from('projects')
          .select('*')
          .eq('name', projectData.name)
          .eq('client_name', projectData.client_name)
          .maybeSingle();

        // Create or update the project
        if (existingProject) {
          // Extract the consultant ID before updating the project
          const consultantId = projectData._assigned_consultant_id;
          
          // Remove the temporary consultant ID from project data
          delete projectData._assigned_consultant_id;
          
          // Update existing project
          const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update({
              ...projectData,
              id: existingProject.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProject.id)
            .select()
            .single();
            
          if (updateError) throw updateError;
          
          // If there's an assigned consultant, update the consultant_projects table
          if (consultantId) {
            // First, check if there's an existing assignment
            const { data: existingAssignment, error: assignmentFetchError } = await supabase
              .from('consultant_projects')
              .select('*')
              .eq('project_id', existingProject.id)
              .eq('consultant_id', consultantId)
              .maybeSingle();
              
            if (assignmentFetchError) {
              console.error('Error fetching existing assignment:', assignmentFetchError);
              throw new Error(`Failed to check existing consultant assignment: ${assignmentFetchError.message}`);
            }
              
            if (existingAssignment) {
// Update existing assignment
              const updateData = {
                role: 'member',
                allocation_percentage: 100,
                start_date: projectData.start_date || new Date().toISOString().split('T')[0],
                end_date: projectData.end_date || null,
                status: 'active',
                updated_at: new Date().toISOString()
              };
              
              const { error: updateAssignmentError } = await supabase
                .from('consultant_projects')
                .update(updateData)
                .eq('id', existingAssignment.id);
                
              if (updateAssignmentError) throw updateAssignmentError;
            } else {
              // Create new assignment
              const assignmentData = {
                project_id: existingProject.id,
                consultant_id: consultantId,
                role: 'member',
                allocation_percentage: 100,
                start_date: projectData.start_date || new Date().toISOString().split('T')[0],
                end_date: projectData.end_date || null,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              const { error: createAssignmentError } = await supabase
                .from('consultant_projects')
                .insert([assignmentData]);
                
              if (createAssignmentError) throw createAssignmentError;
            }
          }
          
        } else {
          // Extract the consultant ID before creating the project
          const consultantId = projectData._assigned_consultant_id;
          
          // Remove the temporary consultant ID from project data
          delete projectData._assigned_consultant_id;
          
          // Create new project
          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert([{
              ...projectData,
              company_id: currentCompany?.id || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
            
          if (createError) throw createError;
          
          // If there's an assigned consultant, add to consultant_projects table
          if (consultantId && newProject) {
            const assignmentData = {
              project_id: newProject.id,
              consultant_id: consultantId,
              role: 'member',
              allocation_percentage: 100,
              start_date: projectData.start_date || new Date().toISOString().split('T')[0],
              end_date: projectData.end_date || null,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const { error: assignmentError } = await supabase
              .from('consultant_projects')
              .insert([assignmentData]);
              
            if (assignmentError) throw assignmentError;
          }
        }

        // Update success count
        results.success++;
        results.records[recordIndex].status = 'success';
      } catch (error) {
        // Log detailed error for debugging
        console.error(`Error processing row ${i + 2}:`, error);
        
        // Get a more descriptive error message
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }
        
        // Update error count and record error
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 for header row and 1-based index
          error: errorMessage,
        });
        results.records[recordIndex].status = 'error';
        results.records[recordIndex].error = errorMessage;
      } finally {
        // Update completed count
        results.completed++;
        setImportResults({ ...results });
        
        // Small delay to prevent UI freeze
        await delay(100);
      }
    }

} catch (error) {
      console.error('Fatal error during import:', error);
      toast({
        title: 'Import Failed',
        description: 'A fatal error occurred during import. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStep('complete');
    }
  };

  // Close the modal
  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a short delay to allow the modal to close
    setTimeout(() => {
      resetState();
    }, 300);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'importing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: step !== 'upload',
  });

  const normalizedHeaders = useMemo(() => {
    if (!headers || !Array.isArray(headers)) return [];
    return headers.map(header => {
      try {
        const headerStr = String(header || '').trim();
        return headerStr || undefined;
      } catch {
        return undefined;
      }
    }).filter((h): h is string => h !== undefined);
  }, [headers]);

  return (
    <ErrorBoundaryComponent
      fallback={(error: Error, reset: () => void) => (
        <ErrorFallback error={error} resetErrorBoundary={reset} />
      )}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="bulk-import-description"
        >
          <DialogHeader>
            <DialogTitle>Bulk Import Projects</DialogTitle>
            <p id="bulk-import-description" className="sr-only">
              Import multiple projects by uploading a CSV or Excel file. Map the columns to project fields and review before importing.
            </p>
          </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (CSV, XLS, XLSX)
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Import Instructions</h3>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>Ensure your file has a header row with column names</li>
                <li>
                  <span className="font-medium">Required fields:</span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Project Name</li>
                    <li>Client Name</li>
                    <li>End Client</li>
                    <li>Start Date (YYYY-MM-DD)</li>
                    <li>Status (active, on_hold, completed, cancelled)</li>
                  </ul>
                </li>
                <li>Assignment ID is optional - if provided, it can be used to auto-generate Project Name</li>
                <li>Allocation % is optional and defaults to 100 if not provided</li>
                <li>End Date is optional</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Map the columns from your file to the project fields below.</p>
              <p className="font-medium mt-2">Required fields are marked with *</p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Mapped Column</TableHead>
                    <TableHead>Sample Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROJECT_FIELDS.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[field.id] || ''}
                          onValueChange={(value) => handleMappingChange(field.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.required ? 'Select column' : 'Optional'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_unmapped">
                              {field.required ? '-- Required --' : '-- Not Mapped --'}
                            </SelectItem>
                            {normalizedHeaders && normalizedHeaders.length > 0 ? (
                              normalizedHeaders
                                .filter(header => header && header.trim() !== '')
                                .map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="_no_columns" disabled>
                                No columns available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {field.options && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Options: {field.options.join(', ')}
                          </p>
                        )}
                        {field.type === 'number' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {field.min && field.max 
                              ? `Range: ${field.min}-${field.max} (default: ${field.defaultValue})`
                              : field.min 
                                ? `Min: ${field.min}`
                                : field.max 
                                  ? `Max: ${field.max}`
                                  : ''}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {records[0] && mapping[field.id] ? (
                          <span className="truncate max-w-xs inline-block" title={String(records[0][mapping[field.id]] || '')}>
                            {String(records[0][mapping[field.id]] || '').substring(0, 50)}
                            {String(records[0][mapping[field.id]] || '').length > 50 ? '...' : ''}
                          </span>
                        ) : field.required ? (
                          <span className="text-red-500 text-xs">Required</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Optional</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setHeaders([]);
                  setRecords([]);
                  setMapping({});
                  setStep('upload');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToReview}
                disabled={!Object.keys(mapping).some(key => PROJECT_FIELDS.find(f => f.id === key).required)}
              >
                <Check className="h-4 w-4 mr-2" />
                Review & Import
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">Ready to import {records.length} projects</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Please review the mapping below before proceeding. The first row of data is shown as a preview.
                  </p>
                </div>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Mapped Column</TableHead>
                    <TableHead>Sample Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROJECT_FIELDS
                    .filter(field => mapping[field.id])
                    .map((field) => {
                      const value = records[0]?.[mapping[field.id]] || '';
                      let displayValue = String(value);
                      
                      if (field.id === 'status') {
                        displayValue = value.charAt(0).toUpperCase() + value.slice(1);
                      } else if ((field.id === 'start_date' || field.id === 'end_date') && value) {
                        try {
                          const date = new Date(value);
                          if (!isNaN(date.getTime())) {
                            displayValue = date.toLocaleDateString();
                          }
                        } catch (e) {
                          // Use the raw value if date parsing fails
                        }
                      }
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </TableCell>
                          <TableCell>{mapping[field.id]}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            <span className="truncate max-w-xs inline-block">
                              {displayValue.substring(0, 50)}
                              {displayValue.length > 50 ? '...' : ''}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('mapping')}
              >
                <X className="h-4 w-4 mr-2" />
                Back to Mapping
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Start Import
              </Button>
            </div>
          </div>
        )}

        {(step === 'importing' || step === 'complete') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">
                  {step === 'importing' ? 'Importing Projects...' : 'Import Complete'}
                </h3>
                <span className="text-sm text-gray-500">
                  {importResults.completed} of {importResults.total}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importResults.completed / importResults.total) * 100}%`,
                  }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-500">
                <span>Success: {importResults.success}</span>
                <span>Failed: {importResults.failed}</span>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Assignment ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResults.records.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <span className="ml-2">
                            {record.status === 'pending' && 'Pending'}
                            {record.status === 'importing' && 'Importing...'}
                            {record.status === 'success' && 'Success'}
                            {record.status === 'error' && record.error ? (
                              <span className="text-red-500">Error: {record.error}</span>
                            ) : record.status === 'error' ? (
                              'Error'
                            ) : null}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 p-3 rounded-md">
                <h4 className="font-medium text-red-800 mb-2">Errors ({importResults.errors.length})</h4>
                <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {importResults.errors.map((error, index) => (
                    <li key={index}>
                      <span className="font-medium">Row {error.row}:</span> {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              {step === 'complete' ? (
                <Button
                  type="button"
                  onClick={() => {
                    onImportComplete();
                    handleClose();
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </ErrorBoundaryComponent>
  );
};

export default ProjectBulkImportModal;
