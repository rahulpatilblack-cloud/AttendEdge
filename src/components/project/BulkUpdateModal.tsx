// src/components/project/BulkUpdateModal.tsx 
import React, { useState, useCallback, useEffect } from 'react';
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
  hire_date?: string;
  is_active?: boolean;
  company_id?: string;
  reporting_manager_id?: string;
  role_id?: string;
  team_id?: string;
}

interface ImportedRecord {
  [key: string]: any;
}

interface UpdateMapping {
  email: string;
  name?: string;
  role?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  is_active?: string;
  company_id?: string;
  reporting_manager_id?: string;
  role_id?: string;
  team_id?: string;
  [key: string]: string | undefined;
}

// Error Boundary Component
class BulkUpdateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BulkUpdateModal error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Something went wrong</h3>
              <p className="text-red-700 text-sm">
                An error occurred while processing the file. Please refresh and try again.
              </p>
              {this.state.error && (
                <p className="text-red-600 text-xs mt-2 font-mono">
                  {this.state.error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({ open, onOpenChange, onUpdateComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<ImportedRecord[]>([]);
  const [mapping, setMapping] = useState<UpdateMapping>({ email: '' });
  const [step, setStep] = useState<'upload' | 'mapping' | 'updating' | 'complete'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState({
    total: 0,
    success: 0,
    failed: 0,
    completed: 0,
    errors: [] as Array<{ email: string; error: string; details?: string; rowNumber?: number; rawData?: any }>,
    records: [] as Array<{
      email: string;
      status: 'pending' | 'updating' | 'success' | 'error';
      error?: string;
      rowNumber?: number;
    }>,
    errorCategories: {} as Record<string, number>,
  });

  const validateFile = useCallback((data: any[][]): { isValid: boolean; error?: string } => {
    if (!Array.isArray(data) || data.length === 0) {
      return { isValid: false, error: 'The file is empty or contains no data' };
    }

    if (!Array.isArray(data[0])) {
      return { isValid: false, error: 'Invalid file format - first row must contain headers' };
    }

    if (data.length < 2) {
      return { isValid: false, error: 'File must contain at least one data row' };
    }

    return { isValid: true };
  }, []);

  const processFile = useCallback(async (file: File) => {
    try {
      console.log('Starting file processing:', file.name, file.size);
      setIsProcessingFile(true);
      setError(null);

      const data = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const result = e.target?.result;
            if (!result) {
              reject(new Error('Failed to read file content'));
              return;
            }
            resolve(new Uint8Array(result as ArrayBuffer));
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
      });

      console.log('File read successfully, parsing...');
      const workbook = XLSX.read(data, { type: 'array', codepage: 1252 }); // Handle cp1252 encoding

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the file');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false, // Convert all to strings to avoid type issues
      }) as any[][];

      console.log('Parsed data rows:', jsonData.length);

      const validation = validateFile(jsonData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const headerRow = (jsonData[0] as any[]).map((h, i) =>
        String(h).trim() || `Column_${i + 1}`
      );

      console.log('Headers:', headerRow);

      const emailColIndex = headerRow.findIndex((h) =>
        h.toLowerCase().includes('email')
      );

      if (emailColIndex === -1) {
        throw new Error('No email column found. Please include an email column to identify records.');
      }

      const mappedRecords = jsonData
        .slice(1)
        .map((row, idx) => {
          if (!Array.isArray(row)) return null;
          const record: ImportedRecord = { __rowNumber: idx + 2 }; // Store original row number
          headerRow.forEach((header, index) => {
            record[header] = row[index] ?? '';
          });
          return record;
        })
        .filter((record): record is ImportedRecord =>
          record !== null && record[headerRow[emailColIndex]]
        );

      console.log('Valid records found:', mappedRecords.length);

      if (mappedRecords.length === 0) {
        throw new Error('No valid records found in the file');
      }

      const autoMap: UpdateMapping = { email: headerRow[emailColIndex] };
      headerRow.forEach((header) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('name') && !autoMap.name) autoMap.name = header;
        if (lowerHeader.includes('role') && !lowerHeader.includes('role_id') && !autoMap.role) autoMap.role = header;
        if (lowerHeader.includes('department') && !autoMap.department) autoMap.department = header;
        if (lowerHeader.includes('position') || lowerHeader.includes('designation')) {
          if (!autoMap.position) autoMap.position = header;
        }
        if ((lowerHeader.includes('hire') || lowerHeader.includes('start')) && lowerHeader.includes('date')) {
          if (!autoMap.hire_date) autoMap.hire_date = header;
        }
        if (lowerHeader.includes('active') && !autoMap.is_active) autoMap.is_active = header;
        if (lowerHeader.includes('company_id') && !autoMap.company_id) autoMap.company_id = header;
        if (lowerHeader.includes('reporting_manager') && !autoMap.reporting_manager_id) autoMap.reporting_manager_id = header;
        if (lowerHeader.includes('role_id') && !autoMap.role_id) autoMap.role_id = header;
        if (lowerHeader.includes('team_id') && !autoMap.team_id) autoMap.team_id = header;
      });

      setHeaders(headerRow);
      setRecords(mappedRecords);
      setMapping(autoMap);
      setStep('mapping');
      setIsProcessingFile(false);

      toast({
        title: 'File loaded successfully',
        description: `Found ${mappedRecords.length} valid records`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
      setError(errorMessage);
      setIsProcessingFile(false);
      toast({
        title: 'Error processing file',
        description: errorMessage,
        variant: 'destructive',
      });
      resetForm();
    }
  }, [validateFile]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    console.log('Files dropped:', acceptedFiles.length, 'Rejected:', fileRejections.length);

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const errorMessage = rejection.errors[0]?.message || 'Invalid file type';
      setError(errorMessage);
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const errorMessage = 'File size exceeds 5MB limit';
      setError(errorMessage);
      toast({
        title: 'File too large',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    setFile(file);
    processFile(file);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: isProcessingFile,
  });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error in BulkUpdateModal:', event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Safe date conversion function
  const convertToDate = (dateValue: any): string | null => {
    if (!dateValue) return null;

    try {
      // Handle Excel serial date number
      if (typeof dateValue === 'number') {
        // Excel stores dates as days since 1900-01-01 (with leap year bug)
        // Valid range: 1 (1900-01-01) to ~60000 (year 2064)
        if (dateValue < 1 || dateValue > 60000) {
          console.warn('Date value out of valid range:', dateValue);
          return null;
        }
        
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
        
        // Validate the resulting date
        if (isNaN(date.getTime())) {
          console.warn('Invalid date generated from Excel serial:', dateValue);
          return null;
        }
        
        return date.toISOString().split('T')[0];
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        const trimmed = dateValue.trim();
        if (!trimmed) return null;
        
        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            return trimmed;
          }
        }
        
        // Try parsing other formats
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          // Validate year is reasonable (1900-2100)
          if (parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
            return parsed.toISOString().split('T')[0];
          }
        }
      }
    } catch (err) {
      console.error('Date conversion error:', err, 'for value:', dateValue);
    }
    
    return null;
  };

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
      records: records.map((record) => ({
        email: record[mapping.email] || '',
        status: 'pending' as const,
      })),
      errorCategories: {},
    });

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const email = record[mapping.email];
      const rowNumber = record.__rowNumber || i + 2;

      try {
        // Update status to updating
        setUpdateResults((prev) => ({
          ...prev,
          records: prev.records.map((r) =>
            r.email === email ? { ...r, status: 'updating' as const } : r
          ),
        }));

        // Validate email
        if (!email || String(email).trim() === '') {
          throw new Error('Missing or empty email address');
        }

        const cleanEmail = String(email).trim().toLowerCase();

        // Prepare update data with STRICT validation
        const updateData: Partial<EmployeeUpdate> = {};
        
        // Only add fields that are mapped AND have valid non-empty values
        if (mapping.name && mapping.name !== '__skip__') {
          const nameValue = record[mapping.name];
          if (nameValue && String(nameValue).trim() && String(nameValue).trim().length > 0) {
            updateData.name = String(nameValue).trim();
          }
        }
        
        if (mapping.role && mapping.role !== '__skip__') {
          const roleValue = record[mapping.role];
          if (roleValue && String(roleValue).trim() && String(roleValue).trim().length > 0) {
            updateData.role = String(roleValue).trim();
          }
        }
        
        if (mapping.department && mapping.department !== '__skip__') {
          const deptValue = record[mapping.department];
          if (deptValue && String(deptValue).trim() && String(deptValue).trim().length > 0) {
            updateData.department = String(deptValue).trim();
          }
        }
        
        if (mapping.position && mapping.position !== '__skip__') {
          const posValue = record[mapping.position];
          if (posValue && String(posValue).trim() && String(posValue).trim().length > 0) {
            updateData.position = String(posValue).trim();
          }
        }
        
        if (mapping.hire_date && mapping.hire_date !== '__skip__') {
          const dateValue = record[mapping.hire_date];
          const convertedDate = convertToDate(dateValue);
          if (convertedDate) {
            updateData.hire_date = convertedDate;
          } else if (dateValue) {
            console.warn(`Row ${rowNumber}: Could not convert date value:`, dateValue);
          }
        }
        
        if (mapping.is_active && mapping.is_active !== '__skip__') {
          const activeValue = String(record[mapping.is_active]).toLowerCase().trim();
          if (activeValue) {
            updateData.is_active = activeValue === 'true' || activeValue === '1' || activeValue === 'yes';
          }
        }
        
        // Handle UUID fields with validation
        if (mapping.company_id && mapping.company_id !== '__skip__') {
          const companyValue = record[mapping.company_id];
          if (companyValue && String(companyValue).trim() && String(companyValue).trim().length > 0) {
            updateData.company_id = String(companyValue).trim();
          }
        }
        
        if (mapping.reporting_manager_id && mapping.reporting_manager_id !== '__skip__') {
          const managerValue = record[mapping.reporting_manager_id];
          if (managerValue && String(managerValue).trim() && String(managerValue).trim().length > 0) {
            updateData.reporting_manager_id = String(managerValue).trim();
          }
        }
        
        if (mapping.role_id && mapping.role_id !== '__skip__') {
          const roleIdValue = record[mapping.role_id];
          if (roleIdValue && String(roleIdValue).trim() && String(roleIdValue).trim().length > 0) {
            updateData.role_id = String(roleIdValue).trim();
          }
        }
        
        if (mapping.team_id && mapping.team_id !== '__skip__') {
          const teamValue = record[mapping.team_id];
          if (teamValue && String(teamValue).trim() && String(teamValue).trim().length > 0) {
            updateData.team_id = String(teamValue).trim();
          }
        }

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
          throw new Error('No valid data to update (all fields are empty or skipped)');
        }

        console.log(`Row ${rowNumber}: Updating ${cleanEmail} with:`, JSON.stringify(updateData));

        // Update employee in database
        const { data, error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('email', cleanEmail)
          .select();

        if (error) {
          console.error(`Row ${rowNumber}: Supabase error:`, {
            email: cleanEmail,
            error,
            updateData,
            originalRecord: record
          });
          
          // Parse error for better messaging
          let errorMsg = error.message;
          if (error.code === '23503') {
            const match = error.message.match(/Key \((.*?)\)=\((.*?)\)/);
            if (match) {
              errorMsg = `Foreign key error: ${match[1]} value "${match[2]}" does not exist`;
            } else {
              errorMsg = `Foreign key constraint violation: One of the ID fields references a non-existent record`;
            }
          } else if (error.code === '23505') {
            errorMsg = `Duplicate value constraint violation`;
          } else if (error.code === '22007' || error.code === '22008') {
            errorMsg = `Invalid date format`;
          } else if (error.code === '22P02') {
            errorMsg = `Invalid UUID format in one of the ID fields`;
          }
          
          throw new Error(errorMsg);
        }

        if (!data || data.length === 0) {
          throw new Error(`Email "${cleanEmail}" not found in database`);
        }

        console.log(`Row ${rowNumber}: ✓ Successfully updated ${cleanEmail}`);

        // Update success count
        setUpdateResults((prev) => ({
          ...prev,
          success: prev.success + 1,
          completed: prev.completed + 1,
          records: prev.records.map((r) =>
            r.email === email ? { ...r, status: 'success' as const } : r
          ),
        }));
      } catch (error) {
        const errorObj = error as any;
        let errorMessage = 'Unknown error';
        let errorCategory = 'Unknown';
        let errorDetails = '';

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Categorize errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
          errorCategory = 'Email Not Found';
          errorDetails = 'The email address does not exist in the employees table';
        } else if (errorMessage.includes('Missing') || errorMessage.includes('empty email')) {
          errorCategory = 'Missing Email';
          errorDetails = 'Email field is empty or missing in the file';
        } else if (errorMessage.includes('Foreign key') || errorMessage.includes('foreign key')) {
          errorCategory = 'Foreign Key Constraint';
          errorDetails = errorMessage;
        } else if (errorMessage.includes('duplicate') || errorMessage.includes('Duplicate')) {
          errorCategory = 'Duplicate Value';
          errorDetails = errorMessage;
        } else if (errorMessage.includes('No valid data')) {
          errorCategory = 'No Data to Update';
          errorDetails = 'All mapped fields are empty';
        } else if (errorMessage.includes('Invalid date')) {
          errorCategory = 'Invalid Date Format';
          errorDetails = errorMessage;
        } else if (errorMessage.includes('Invalid UUID')) {
          errorCategory = 'Invalid UUID Format';
          errorDetails = errorMessage;
        } else {
          errorCategory = 'Database Error';
          errorDetails = errorMessage;
        }

        console.error(`Row ${rowNumber}: ✗ Error for ${email}:`, {
          category: errorCategory,
          message: errorMessage,
          rawRecord: record,
        });

        setUpdateResults((prev) => {
          const newErrorCategories = { ...prev.errorCategories };
          newErrorCategories[errorCategory] = (newErrorCategories[errorCategory] || 0) + 1;

          return {
            ...prev,
            failed: prev.failed + 1,
            completed: prev.completed + 1,
            errors: [...prev.errors, { 
              email: email || `Row ${rowNumber}`, 
              error: errorMessage, 
              details: errorDetails, 
              rowNumber,
              rawData: record // Include raw data for debugging
            }],
            records: prev.records.map((r) =>
              r.email === email ? { ...r, status: 'error' as const, error: `${errorCategory}: ${errorMessage}`, rowNumber } : r
            ),
            errorCategories: newErrorCategories,
          };
        });
      }
    }

    setIsLoading(false);
    setStep('complete');
    onUpdateComplete?.();
  };

  const validateMappings = () => {
    if (!mapping.email || mapping.email === '__skip__') {
      toast({
        title: 'Email mapping required',
        description: 'Please map the email column to identify records',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const resetForm = useCallback(() => {
    console.log('Resetting form');
    setFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({ email: '' });
    setStep('upload');
    setError(null);
    setIsProcessingFile(false);
    setUpdateResults({
      total: 0,
      success: 0,
      failed: 0,
      completed: 0,
      errors: [],
      records: [],
      errorCategories: {},
    });
    setIsLoading(false);
  }, []);

  const updateProgress = updateResults.total > 0
    ? Math.round((updateResults.completed / updateResults.total) * 100)
    : 0;

  return (
    <BulkUpdateErrorBoundary>
      <Dialog open={open} onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Update Employees</DialogTitle>
          </DialogHeader>

          {isProcessingFile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="font-medium">Processing file...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop an Excel/CSV file here, or click to select'}
                  </p>
                  <p className="text-sm text-gray-500">Supports .xls, .xlsx, .csv files (max 5MB)</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 File Format Requirements</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>First row must contain column headers</li>
                    <li>Must include an "Email" column to identify records</li>
                    <li>Only mapped fields will be updated</li>
                    <li>Empty cells will be skipped</li>
                    <li>Dates should be in Excel date format or YYYY-MM-DD</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 'mapping' && headers.length > 0 && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    Map the columns from your file to employee fields. Only map the fields you want to update.
                  </p>
                  <p className="text-xs text-gray-600">
                    Found {headers.length} columns with {records.length} records
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Map to Column</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['email', 'name', 'role', 'department', 'position', 'hire_date', 'is_active', 'company_id', 'reporting_manager_id', 'role_id', 'team_id'].map((field) => (
                      <TableRow key={field}>
                        <TableCell className="font-medium">
                          {field === 'is_active' ? 'Active Status' : 
                           field === 'hire_date' ? 'Hire Date' :
                           field === 'company_id' ? 'Company ID' :
                           field === 'reporting_manager_id' ? 'Reporting Manager ID' :
                           field === 'role_id' ? 'Role ID' :
                           field === 'team_id' ? 'Team ID' :
                           field.charAt(0).toUpperCase() + field.slice(1)}
                          {field === 'email' && <span className="text-red-500 ml-1">*</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[field] || '__skip__'}
                            onValueChange={(value) => {
                              if (value === '__skip__') {
                                const newMapping = { ...mapping };
                                delete newMapping[field];
                                setMapping(newMapping);
                              } else {
                                setMapping((prev) => ({ ...prev, [field]: value }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="-- Skip --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">-- Skip --</SelectItem>
                              {headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {step === 'updating' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Updating {updateResults.completed} of {updateResults.total} records
                  </p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-700">✓ {updateResults.success} Updated</span>
                    <span className="text-red-700">✗ {updateResults.failed} Failed</span>
                    <span className="text-gray-700">⏳ {updateResults.total - updateResults.completed} Pending</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Update Progress</span>
                    <span>{updateProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${updateProgress}%` }}
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updateResults.records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{record.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {record.status === 'success' && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {record.status === 'error' && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              {record.status === 'updating' && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                              {record.status === 'pending' && (
                                <Clock className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </div>
                            {record.status === 'error' && record.error && (
                              <p className="text-xs text-red-600 mt-1">{record.error}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {updateResults.failed > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      <AlertTriangle className="inline h-4 w-4 mr-1" />
                      {updateResults.failed} update{updateResults.failed !== 1 ? 's' : ''} failed
                    </p>
                    <p className="text-xs text-yellow-800 mt-1">
                      Common issues: Invalid email, invalid data format, or record not found
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 'complete' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-3" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Update Complete</h3>
                  <p className="text-green-800">
                    Successfully updated {updateResults.success} of {updateResults.total} records.
                  </p>
                </div>

                {updateResults.failed > 0 && (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-red-900 font-semibold mb-1">
                            ⚠️ {updateResults.failed} record{updateResults.failed !== 1 ? 's' : ''} failed to update
                          </p>
                          <p className="text-xs text-red-700">
                            Review the error categories and details below to understand what went wrong
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const errorReport = updateResults.errors.map(err => ({
                              'Row Number': err.rowNumber || 'N/A',
                              'Email': err.email,
                              'Error': err.error,
                              'Details': err.details || ''
                            }));
                            const csv = [
                              Object.keys(errorReport[0]).join(','),
                              ...errorReport.map(row => Object.values(row).map(v => `"${v}"`).join(','))
                            ].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `bulk-update-errors-${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Export Errors
                        </Button>
                      </div>

                      {Object.keys(updateResults.errorCategories).length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-red-800 mb-2">Error Categories:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(updateResults.errorCategories).map(([category, count]) => (
                              <div key={category} className="bg-white rounded px-3 py-2 border border-red-200">
                                <p className="text-xs font-medium text-red-900">{category}</p>
                                <p className="text-lg font-bold text-red-700">{count}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-900">Failed Records Details</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Row</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Error</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {updateResults.errors.slice(0, 50).map((error, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-xs">{error.rowNumber || 'N/A'}</TableCell>
                                <TableCell className="text-xs">{error.email}</TableCell>
                                <TableCell className="text-xs text-red-600">
                                  <div className="font-medium">{error.error}</div>
                                  {error.details && (
                                    <div className="text-gray-600 mt-1">{error.details}</div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {updateResults.errors.length > 50 && (
                          <div className="p-3 text-center text-xs text-gray-600 bg-gray-50 border-t">
                            Showing first 50 errors. Export full error report for complete details.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
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
                <Button onClick={handleUpdate} disabled={isLoading}>
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

            {(step === 'complete' || (step === 'updating' && updateResults.completed === updateResults.total)) && (
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
    </BulkUpdateErrorBoundary>
  );
};

export default BulkUpdateModal;