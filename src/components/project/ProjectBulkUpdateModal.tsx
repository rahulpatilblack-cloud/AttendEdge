// src/components/project/ProjectBulkUpdateModal.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEmployees } from '@/hooks/useEmployees';

interface ProjectBulkUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateComplete: () => void;
}

// Define the expected fields for bulk update
const UPDATE_FIELDS = [
  { id: 'project_id', label: 'Project ID (Optional)', required: false },
  { id: 'project_name', label: 'Project Name', required: true },
  { id: 'assigned_consultant', label: 'Assigned Consultant', required: true },
  { id: 'allocation_percentage', label: 'Allocation %', required: true },
  { id: 'start_date', label: 'Start Date', required: true },
  { id: 'end_date', label: 'End Date', required: false },
  { id: 'status', label: 'Status', required: true, options: ['active', 'inactive'] },
];

const ProjectBulkUpdateModal: React.FC<ProjectBulkUpdateModalProps> = ({
  open,
  onOpenChange,
  onUpdateComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'review' | 'updating' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [updateResults, setUpdateResults] = useState<{
    success: number;
    failed: number;
    total: number;
    completed: number;
    errors: Array<{ row: number; error: string }>;
    records: Array<{
      index: number;
      status: 'pending' | 'updating' | 'success' | 'error';
      error?: string;
    }>;
  }>({
    success: 0,
    failed: 0,
    total: 0,
    completed: 0,
    errors: [],
    records: [],
  });

  // Get employees list for consultant lookup
  const { employees } = useEmployees();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
        
        if (jsonData.length < 2) {
          toast({
            title: 'Error',
            description: 'The file is empty or has no data rows.',
            variant: 'destructive',
          });
          return;
        }

        const [headerRow, ...rows] = jsonData;
        const filteredHeaders = headerRow.filter(Boolean) as string[];
        
        setHeaders(filteredHeaders);
        
        // Auto-map fields based on header names
        const autoMapping: Record<string, string> = {};
        filteredHeaders.forEach(header => {
          const matchedField = UPDATE_FIELDS.find(
            field => header.toLowerCase().includes(field.id.toLowerCase())
          );
          if (matchedField) {
            autoMapping[matchedField.id] = header;
          }
        });
        
        setMapping(autoMapping);
        
        // Convert rows to records
        const recordData = rows
          .filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''))
          .map((row, index) => {
            const record: Record<string, any> = { _row: index + 2 }; // +2 for 1-based index and header row
            filteredHeaders.forEach((header, i) => {
              record[header] = row[i];
            });
            return record;
          });
        
        setRecords(recordData);
        setUpdateResults(prev => ({
          ...prev,
          total: recordData.length,
          records: recordData.map((_, index) => ({
            index,
            status: 'pending' as const,
          })),
        }));
        
        setStep('review');
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: 'Error',
          description: 'Failed to process the file. Please make sure it is a valid Excel file.',
          variant: 'destructive',
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleMappingChange = (fieldId: string, value: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const validateMappings = () => {
    const requiredFields = UPDATE_FIELDS.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !mapping[field.id]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please map the following required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleStartUpdate = () => {
    if (!validateMappings()) return;
    setStep('updating');
    processUpdates();
  };

  const processUpdates = async () => {
    setIsLoading(true);
    const results = {
      success: 0,
      failed: 0,
      total: records.length,
      completed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordIndex = updateResults.records.findIndex(r => r.index === i);
      
      if (recordIndex === -1) continue;

      // Update status to updating
      setUpdateResults(prev => {
        const newRecords = [...prev.records];
        newRecords[recordIndex] = { ...newRecords[recordIndex], status: 'updating' };
        return { ...prev, records: newRecords };
      });

      try {
        // Map record fields to update data
        const updateData: any = {};
        const mappedFields: Record<string, string> = {};

        // Get the reverse mapping (header -> field)
        Object.entries(mapping).forEach(([fieldId, header]) => {
          mappedFields[header] = fieldId;
        });

        // Map the data according to the field mapping
        Object.entries(record).forEach(([header, value]) => {
          if (header === '_row') return; // Skip internal row number
          
          const fieldId = mappedFields[header];
          if (fieldId && value !== undefined && value !== null && value !== '') {
            updateData[fieldId] = value;
          }
        });

        // Validate required fields
        const requiredFields = UPDATE_FIELDS.filter(f => f.required).map(f => f.id);
        const missingFields = requiredFields.filter(field => 
          !updateData[field] && updateData[field] !== 0
        );

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Get project by name (project_id is optional)
        let projectData;
        let query = supabase
          .from('projects')
          .select('*');

        // If project_id is provided, use it for more specific lookup
        if (updateData.project_id) {
          query = query.eq('id', updateData.project_id);
        } else {
          // Otherwise search by name (case-insensitive exact match first)
          query = query.ilike('name', updateData.project_name);
        }

        const { data, error: projectError } = await query.maybeSingle();

        if (projectError || !data) {
          // If not found by exact match, try partial match
          if (updateData.project_name && !updateData.project_id) {
            const { data: partialMatchData, error: partialMatchError } = await supabase
              .from('projects')
              .select('*')
              .ilike('name', `%${updateData.project_name}%`)
              .maybeSingle();
              
            if (!partialMatchError && partialMatchData) {
              projectData = partialMatchData;
            } else {
              throw new Error(`Project not found: ${updateData.project_name}. Please check the project name and try again.`);
            }
          } else {
            throw new Error(`Project not found: ${updateData.project_name || updateData.project_id}`);
          }
        } else {
          projectData = data;
        }

        // Look up consultant by name
        const consultantName = updateData.assigned_consultant?.trim();
        if (!consultantName) {
          throw new Error('Consultant name is required');
        }

        // Find consultant in the employees list
        const consultant = employees.find(emp =>
          emp.name?.toLowerCase() === consultantName.toLowerCase() ||
          emp.email?.toLowerCase() === consultantName.toLowerCase()
        );

        if (!consultant) {
          throw new Error(`Consultant not found: ${consultantName}. Please check the name and try again.`);
        }

        // Prepare the assignment data
        const assignmentData = {
          project_id: projectData.id,
          consultant_id: consultant.id,
          allocation_percentage: 100, // Fixed at 100% as per requirements
          start_date: updateData.start_date || new Date().toISOString().split('T')[0],
          end_date: updateData.end_date || null,
          is_active: updateData.status === 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Check if the assignment already exists
        const { data: existingAssignment, error: assignmentError } = await supabase
          .from('consultant_projects')
          .select('id')
          .eq('project_id', projectData.id)
          .eq('consultant_id', consultant.id)
          .maybeSingle();

        let upsertError;
        if (existingAssignment) {
          // Update existing assignment
          const { error } = await supabase
            .from('consultant_projects')
            .update(assignmentData)
            .eq('id', existingAssignment.id);
          upsertError = error;
        } else {
          // Create new assignment
          const { error } = await supabase
            .from('consultant_projects')
            .insert([assignmentData]);
          upsertError = error;
        }

        if (upsertError) {
          throw new Error(`Failed to save assignment: ${upsertError.message}`);
        }

        // If we get here, everything was successful
        results.success++;

        // Update the UI to show success
        setUpdateResults(prev => ({
          ...prev,
          success: results.success,
          completed: results.completed + 1,
          records: prev.records.map((r, idx) =>
            idx === recordIndex ? { ...r, status: 'success' } : r
          )
        }));

      } catch (error: any) {
        console.error('Error processing record:', error);
        results.failed++;
        results.errors.push({
          row: record._row || i + 2, // +2 for 1-based index and header row
          error: error.message || 'Unknown error'
        });

        setUpdateResults(prev => ({
          ...prev,
          failed: results.failed,
          completed: results.completed + 1,
          records: prev.records.map((r, idx) =>
            idx === recordIndex ? { ...r, status: 'error', error: error.message } : r
          )
        }));
      }
      
      // Add a small delay between updates to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsLoading(false);
    setStep('complete');
    onUpdateComplete();
  };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setUpdateResults({
      success: 0,
      failed: 0,
      total: 0,
      completed: 0,
      errors: [],
      records: [],
    });
    setStep('upload');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleComplete = () => {
    resetForm();
    onOpenChange(false);
    if (updateResults.success > 0) {
      toast({
        title: 'Bulk update completed',
        description: `Successfully updated ${updateResults.success} project assignments.`,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'updating':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Project Assignments</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium">Drag and drop your Excel file here</p>
                <p className="text-sm text-gray-500">or click to browse files</p>
                <p className="text-xs text-gray-400 mt-2">Supported formats: .xlsx, .xls, .csv</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">File Requirements</h3>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>File must include a header row with column names</li>
                <li>Required columns: Project Name, Assigned Consultant (name), Allocation %, Start Date, Status</li>
                <li>Project ID is optional - if not provided, the system will search by Project Name</li>
                <li>Status must be either "active" or "inactive"</li>
                <li>Allocation % must be a number between 1 and 100</li>
                <li>Dates should be in YYYY-MM-DD format</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Review Import</h3>
                <p className="text-sm text-gray-500">
                  {records.length} records found in {file?.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('upload')}
                disabled={isLoading}
              >
                Change File
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Consultant</TableHead>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 5).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {mapping.project_id && record[mapping.project_id]}
                          {!mapping.project_id && mapping.project_name && record[mapping.project_name]}
                        </TableCell>
                        <TableCell>{mapping.assigned_consultant && record[mapping.assigned_consultant]}</TableCell>
                        <TableCell>
                          {mapping.allocation_percentage && record[mapping.allocation_percentage]}%
                        </TableCell>
                        <TableCell>{mapping.start_date && record[mapping.start_date]}</TableCell>
                        <TableCell>
                          {mapping.status && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record[mapping.status] === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record[mapping.status] || 'N/A'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {records.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-2">
                          + {records.length - 5} more records not shown
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Field Mapping Section */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Map Columns to Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {UPDATE_FIELDS.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={mapping[field.id] || ''}
                      onChange={(e) => handleMappingChange(field.id, e.target.value)}
                    >
                      <option value="">Select column...</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('upload')}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleStartUpdate}
                  disabled={isLoading || !validateMappings()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Start Update'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {(step === 'updating' || step === 'complete') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {step === 'updating' ? 'Updating Records...' : 'Update Complete'}
                </h3>
                <p className="text-sm text-gray-500">
                  {step === 'updating' 
                    ? `Processing ${updateResults.completed} of ${updateResults.total} records...` 
                    : `Updated ${updateResults.success} of ${updateResults.total} records successfully.`}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-green-600">
                  {updateResults.success} Success
                </span>
                {updateResults.failed > 0 && (
                  <span className="text-sm font-medium text-red-600">
                    {updateResults.failed} Failed
                  </span>
                )}
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updateResults.records.slice(0, 20).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusIcon(record.status)}
                            <span className="ml-2 capitalize">{record.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.status === 'error' ? (
                            <span className="text-red-600 text-sm">{record.error}</span>
                          ) : (
                            <span className="text-gray-600 text-sm">
                              {record.status === 'success' 
                                ? 'Updated successfully' 
                                : record.status === 'updating'
                                ? 'Updating...'
                                : 'Pending'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {updateResults.records.length > 20 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-2">
                          + {updateResults.records.length - 20} more records not shown
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {step === 'complete' && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleComplete}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProjectBulkUpdateModal;