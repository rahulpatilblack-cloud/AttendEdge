// src/components/project/BulkUpdateModal.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface BulkUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateComplete: () => void;
}

interface EmployeeUpdate {
  email: string;
  name?: string;
  role?: string;
  department?: string;
  position?: string;
  is_active?: boolean;
  reporting_manager_id?: string;
  team_id?: string;
}

const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({ 
  open, 
  onOpenChange,
  onUpdateComplete 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'updating' | 'complete'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [updateResults, setUpdateResults] = useState({
    total: 0,
    success: 0,
    failed: 0,
    completed: 0,
    errors: [] as Array<{ email: string; error: string }>,
    records: [] as Array<{
      email: string;
      status: 'pending' | 'updating' | 'success' | 'error';
      error?: string;
    }>
  });

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
        const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '', blankrows: false });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('The file is empty or contains no data');
        }

        const headerRow = jsonData[0].map((h: any) => String(h).trim() || `Column_${index + 1}`);
        const dataRows = jsonData.slice(1);

        // Auto-map email column if possible
        const emailColIndex = headerRow.findIndex(h => 
          h.toLowerCase().includes('email')
        );

        if (emailColIndex === -1) {
          throw new Error('No email column found. Please include an email column to identify records.');
        }

        const mappedRecords = dataRows.map(row => {
          const record: any = {};
          headerRow.forEach((header, index) => {
            record[header] = row[index] ?? '';
          });
          return record;
        }).filter(record => record[headerRow[emailColIndex]]); // Filter out rows without email

        setHeaders(headerRow);
        setRecords(mappedRecords);
        setStep('mapping');
        
        // Auto-map common fields
        const autoMap: Record<string, string> = { email: headerRow[emailColIndex] };
        headerRow.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name')) autoMap.name = header;
          if (lowerHeader.includes('role')) autoMap.role = header;
          if (lowerHeader.includes('department')) autoMap.department = header;
          if (lowerHeader.includes('position')) autoMap.position = header;
          if (lowerHeader.includes('active')) autoMap.is_active = header;
        });
        setMapping(autoMap);

      } catch (error) {
        toast({
          title: 'Error processing file',
          description: error instanceof Error ? error.message : 'Invalid file format',
          variant: 'destructive',
        });
        resetForm();
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Failed to read the file. Please try again.',
        variant: 'destructive',
      });
      resetForm();
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleUpdate = async () => {
    if (!validateMappings()) return;

    setStep('updating');
    setIsLoading(true);

    // Initialize update results
    setUpdateResults({
      total: records.length,
      success: 0,
      failed: 0,
      completed: 0,
      errors: [],
      records: records.map(record => ({
        email: record[mapping.email] || '',
        status: 'pending' as const,
      })),
    });

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const email = record[mapping.email];

      try {
        // Update status to updating
        setUpdateResults(prev => ({
          ...prev,
          records: prev.records.map(r => 
            r.email === email ? { ...r, status: 'updating' as const } : r
          ),
        }));

        if (!email) {
          throw new Error('Missing email address');
        }

        // Prepare update data
        const updateData: Partial<EmployeeUpdate> = {};
        
        if (mapping.name) updateData.name = record[mapping.name];
        if (mapping.role) updateData.role = record[mapping.role];
        if (mapping.department) updateData.department = record[mapping.department];
        if (mapping.position) updateData.position = record[mapping.position];
        if (mapping.is_active) {
          updateData.is_active = String(record[mapping.is_active]).toLowerCase() === 'true';
        }

        // Remove undefined values
        Object.keys(updateData).forEach(
          key => updateData[key as keyof EmployeeUpdate] === undefined && 
          delete updateData[key as keyof EmployeeUpdate]
        );

        // Update employee in database
        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('email', email);

        if (error) throw error;

        // Update success count
        setUpdateResults(prev => ({
          ...prev,
          success: prev.success + 1,
          completed: prev.completed + 1,
          records: prev.records.map(r => 
            r.email === email ? { ...r, status: 'success' as const } : r
          ),
        }));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setUpdateResults(prev => ({
          ...prev,
          failed: prev.failed + 1,
          completed: prev.completed + 1,
          errors: [...prev.errors, { email, error: errorMessage }],
          records: prev.records.map(r => 
            r.email === email ? { 
              ...r, 
              status: 'error' as const,
              error: errorMessage
            } : r
          ),
        }));
      }
    }

    setIsLoading(false);
    onUpdateComplete?.();
  };

  const validateMappings = () => {
    if (!mapping.email) {
      toast({
        title: 'Email mapping required',
        description: 'Please map the email column to identify records',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setStep('upload');
    setUpdateResults({
      total: 0,
      success: 0,
      failed: 0,
      completed: 0,
      errors: [],
      records: [],
    });
    setIsLoading(false);
  };

  const updateProgress = updateResults.total > 0
    ? Math.round((updateResults.completed / updateResults.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Employees</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop an Excel/CSV file here, or click to select'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Supports .xls, .xlsx, .csv files</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  File Format Requirements
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>First row must contain column headers</li>
                  <li>Must include an email column to identify records</li>
                  <li>Only mapped fields will be updated</li>
                  <li>Empty cells will be skipped (no update)</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'mapping' && headers.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map the columns from your file to employee fields. Only map the fields you want to update.
              </p>

              <div className="bg-gray-50 border rounded-md p-3 text-sm">
                <strong>Found {headers.length} columns:</strong> {headers.join(', ')}
              </div>

              <div className="grid grid-cols-4 gap-4 font-medium border-b pb-2">
                <div>Field</div>
                <div className="col-span-3">Map to Column</div>
              </div>

              {['email', 'name', 'role', 'department', 'position', 'is_active'].map((field) => (
                <div key={field} className="grid grid-cols-4 gap-4 items-center">
                  <div className="font-medium">
                    {field === 'is_active' ? 'Active Status' : field.charAt(0).toUpperCase() + field.slice(1)}
                    {field === 'email' && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={mapping[field] || ''}
                      onValueChange={(value) => {
                        setMapping(prev => ({ ...prev, [field]: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Skip --</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 'updating' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="flex items-center justify-center mb-2">
                  <Loader2 className={`h-8 w-8 animate-spin ${
                    updateProgress === 100 
                      ? updateResults.failed === 0 
                        ? 'text-green-500' 
                        : 'text-yellow-500'
                      : 'text-blue-500'
                  }`} />
                </div>
                <p className="text-lg font-medium mb-1">
                  Updating {updateResults.completed} of {updateResults.total} records
                </p>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${updateProgress}%`,
                      backgroundColor: updateProgress === 100 
                        ? (updateResults.failed === 0 ? '#10B981' : '#F59E0B') 
                        : '#3B82F6',
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="text-green-600">
                    <CheckCircle className="inline w-4 h-4 mr-1" />
                    {updateResults.success} Updated
                  </span>
                  <span className="text-red-600">
                    <XCircle className="inline w-4 h-4 mr-1" />
                    {updateResults.failed} Failed
                  </span>
                  <span className="text-blue-600">
                    <Loader2 className="inline w-4 h-4 mr-1 animate-spin" />
                    {updateResults.total - updateResults.completed} Pending
                  </span>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium">Update Progress</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {updateResults.records.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : record.status === 'updating'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status === 'success' && (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              )}
                              {record.status === 'error' && (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {record.status === 'updating' && (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              )}
                              {record.status === 'pending' && (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                            {record.status === 'error' && record.error && (
                              <div className="text-xs text-red-500 mt-1 truncate" title={record.error}>
                                {record.error}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {updateResults.failed > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium mb-1">
                    <AlertTriangle className="inline w-4 h-4 mr-1" />
                    {updateResults.failed} update{updateResults.failed !== 1 ? 's' : ''} failed
                  </p>
                  <p className="text-xs">
                    Common issues: Invalid email, invalid data format, or record not found
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium">Update Complete</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Successfully updated {updateResults.success} of {updateResults.total} records.
              </p>
              {updateResults.failed > 0 && (
                <p className="mt-1 text-sm text-yellow-600">
                  {updateResults.failed} record{updateResults.failed !== 1 ? 's' : ''} failed to update.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('mapping')} 
                disabled={!file || records.length === 0}
              >
                Next: Map Columns
              </Button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={isLoading || !mapping.email}
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
            </>
          )}

          {(step === 'complete' || step === 'updating' && updateResults.completed === updateResults.total) && (
            <Button onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUpdateModal;