// src/components/project/BulkImportModal.tsx
import React, { useState, useCallback } from 'react';

// Helper function to add delay between imports
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, FileText, Upload, X, Loader2, AlertTriangle, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportStart?: () => void;
  onImportComplete: () => void;
  addConsultant: (email: string, password: string, name: string, role: string, companyId: string, department: string) => Promise<{ success: boolean; error?: string }>;
  isImporting?: boolean;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  open,
  onOpenChange,
  onImportStart,
  onImportComplete,
  addConsultant,
}) => {
  const { currentCompany } = useCompany();
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
      email: string;
      status: 'pending' | 'importing' | 'success' | 'error';
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

  // Track import progress
  const importProgress = importResults.total > 0
    ? Math.round((importResults.completed / importResults.total) * 100)
    : 0;

  // FIXED: Enhanced file upload with proper empty header handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('=== FILE DROP STARTED ===');
    console.log('Accepted files:', acceptedFiles);

    const file = acceptedFiles[0];
    if (!file) {
      console.error('No file provided');
      return;
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    setFile(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      console.log('=== FILE READ STARTED ===');

      try {
        if (!e.target?.result) {
          throw new Error('File read result is empty');
        }

        console.log('Reading file buffer...');
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        console.log('Buffer size:', data.length);

        console.log('Parsing workbook...');
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Workbook sheets:', workbook.SheetNames);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No sheets found in the file');
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        console.log('First sheet:', workbook.SheetNames[0]);

        // Get all data as array of arrays
        const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
          header: 1,
          defval: '', // Default value for empty cells
          blankrows: false, // Skip blank rows
        });

        console.log('Raw JSON data rows:', jsonData.length);
        console.log('First 3 rows:', jsonData.slice(0, 3));

        if (!jsonData || jsonData.length === 0) {
          throw new Error('The file is empty or contains no data');
        }

        // FIXED: Extract and validate headers with proper empty handling
        const headerRow = jsonData[0];
        if (!Array.isArray(headerRow) || headerRow.length === 0) {
          throw new Error('No headers found in the first row');
        }

        // Step 1: Clean and generate names for empty headers
        let headers = headerRow
          .map((h: any, i: number) => {
            if (h === null || h === undefined || h === '') {
              return `Column_${i + 1}`; // Generate column name for empty headers
            }
            const trimmed = String(h).trim();
            return trimmed || `Column_${i + 1}`; // Fallback for whitespace-only headers
          })
          .filter((h: string) => h !== ''); // Remove any remaining empty strings

        // Step 2: Ensure uniqueness (separate step to avoid reference error)
        const seenHeaders = new Map<string, number>();
        headers = headers.map((h: string) => {
          const count = seenHeaders.get(h) || 0;
          seenHeaders.set(h, count + 1);
          return count > 0 ? `${h}_${count + 1}` : h;
        });

        console.log('Extracted headers:', headers);
        console.log('Headers after processing:', headers.map((h, i) => `${i}: "${h}"`));

        if (headers.length === 0) {
          throw new Error('No valid headers found. Please ensure the first row contains column names.');
        }

        // Verify no empty headers made it through
        const emptyHeaders = headers.filter((h) => !h || h.trim() === '');
        if (emptyHeaders.length > 0) {
          console.error('Found empty headers after processing:', emptyHeaders);
          throw new Error('Some column headers are empty. Please fix your file.');
        }

        // Process data rows (skip header row)
        const dataRows = jsonData.slice(1);
        console.log('Data rows to process:', dataRows.length);

        const records = dataRows
          .map((row: any[], index: number) => {
            if (!Array.isArray(row)) {
              console.warn(`Row ${index + 2} is not an array:`, row);
              return null;
            }

            const record: any = {
              __rowNum__: index + 2, // +2 for 1-based index and header row
              __originalRow__: row, // Store original for debugging
            };

            // Map each cell to its header
            headers.forEach((header: string, colIndex: number) => {
              const cellValue = row[colIndex];

              // Handle different cell value types
              if (cellValue === null || cellValue === undefined || cellValue === '') {
                record[header] = '';
              } else if (typeof cellValue === 'string') {
                record[header] = cellValue.trim();
              } else if (typeof cellValue === 'number') {
                record[header] = String(cellValue);
              } else if (typeof cellValue === 'boolean') {
                record[header] = cellValue ? 'Yes' : 'No';
              } else {
                record[header] = String(cellValue);
              }
            });

            return record;
          })
          .filter((record: any) => {
            if (!record) return false;

            // Check if row has at least one non-empty value
            const values = Object.entries(record)
              .filter(([key]) => !key.startsWith('__')) // Ignore internal fields
              .map(([, val]) => val);

            const hasData = values.some((val: any) => {
              if (val === null || val === undefined) return false;
              if (typeof val === 'string' && val.trim() === '') return false;
              return true;
            });

            return hasData;
          });

        console.log('Valid records after filtering:', records.length);
        console.log('Sample record:', records[0]);

        if (records.length === 0) {
          throw new Error('No valid data rows found. Please check your file format.');
        }

        // Update state
        console.log('Setting state with headers and records...');
        setHeaders(headers);
        setRecords(records);
        setMapping({}); // Reset previous mappings

        console.log('Transitioning to mapping step...');
        setStep('mapping');

        toast({
          title: 'File uploaded successfully',
          description: `Found ${headers.length} columns and ${records.length} data rows`,
        });

        console.log('=== FILE PROCESSING COMPLETE ===');
      } catch (error) {
        console.error('=== FILE PROCESSING ERROR ===');
        console.error('Error details:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');

        toast({
          title: 'Error processing file',
          description: error instanceof Error ? error.message : 'Invalid file format. Please check the console for details.',
          variant: 'destructive',
        });

        // Reset to upload state on error
        resetForm();
      }
    };

    reader.onerror = (error) => {
      console.error('=== FILE READ ERROR ===');
      console.error('FileReader error:', error);

      toast({
        title: 'Error reading file',
        description: 'Failed to read the file. Please try again.',
        variant: 'destructive',
      });

      resetForm();
    };

    console.log('Starting to read file as ArrayBuffer...');
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
    onDropRejected: (fileRejections) => {
      console.error('Files rejected:', fileRejections);
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel (.xls, .xlsx) or CSV (.csv) file',
        variant: 'destructive',
      });
    },
  });

  const handleImport = async () => {
    console.log('=== IMPORT STARTED ===');

    if (!validateMappings()) return;

    if (onImportStart) onImportStart();

    setStep('importing');
    setIsLoading(true);
    onImportStart?.();

    const requiredFields = ['name', 'email', 'role', 'department'];
    const missingFields = requiredFields.filter(field => !mapping[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setImportResults(prev => ({
      ...prev,
      total: records.length,
      success: 0,
      failed: 0,
      completed: 0,
      errors: [],
      records: records.map((record, index) => ({
        index,
        email: record[mapping.email] || `Record ${index + 1}`,
        status: 'pending' as const,
      })),
    }));

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordNum = i + 1;

      try {
        // Add 500ms delay between imports (except before the first one)
        if (i > 0) {
          await delay(500);
        }
        // Update status to importing
        setImportResults(prev => ({
          ...prev,
          records: prev.records.map(r => 
            r.index === i ? { ...r, status: 'importing' as const } : r
          ),
        }));

        // Validate required fields
        const missingRequired = requiredFields.some(field => {
          const value = record[mapping[field]];
          return !value || (typeof value === 'string' && value.trim() === '');
        });

        if (missingRequired) {
          throw new Error('Missing required fields');
        }

        // Prepare consultant data
        const consultantData = {
          name: record[mapping.name],
          email: record[mapping.email],
          role: record[mapping.role],
          department: record[mapping.department],
          position: mapping.position ? record[mapping.position] : undefined,
          password: mapping.password ? record[mapping.password] : 'Temp123!',
        };

        // Add consultant
        const { success, error } = await addConsultant(
          consultantData.email,
          consultantData.password,
          {
            name: consultantData.name,
            role: consultantData.role,
            department: consultantData.department,
            position: consultantData.position,
            company_id: currentCompany?.id || '',
          }
        );

        if (!success) {
          throw new Error(error || 'Failed to add consultant');
        }

        // Update success count and status
        setImportResults(prev => ({
          ...prev,
          success: prev.success + 1,
          completed: prev.completed + 1,
          records: prev.records.map(r => 
            r.index === i ? { ...r, status: 'success' as const } : r
          ),
        }));
      } catch (error) {
        console.error(`Error importing record ${recordNum}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setImportResults(prev => ({
          ...prev,
          failed: prev.failed + 1,
          completed: prev.completed + 1,
          errors: [...prev.errors, { row: recordNum, error: errorMessage }],
          records: prev.records.map(r => 
            r.index === i ? { 
              ...r, 
              status: 'error' as const, 
              error: errorMessage 
            } : r
          ),
        }));
      }
    }

    setIsLoading(false);
    onImportComplete?.();
  };

  // FIXED: Enhanced validation with empty string checks
  const validateMappings = () => {
    console.log('Validating mappings:', mapping);

    const requiredFields = ['name', 'email', 'role', 'department'];
    const missingFields = requiredFields.filter(field => !mapping[field] || !mapping[field].trim());

    if (missingFields.length > 0) {
      console.error('Missing required field mappings:', missingFields);
      toast({
        title: 'Missing required fields',
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    // Validate that mapped columns exist in headers
    const invalidMappings = Object.entries(mapping).filter(([, column]) =>
      column && column.trim() !== '' && !headers.includes(column),
    );

    if (invalidMappings.length > 0) {
      console.error('Invalid mappings detected:', invalidMappings);
      toast({
        title: 'Invalid mappings',
        description: 'Some mapped columns do not exist in the file',
        variant: 'destructive',
      });
      return false;
    }

    console.log('✓ Mappings validated successfully');
    return true;
  };

  const resetForm = () => {
    console.log('Resetting form...');
    setFile(null);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setStep('upload');
    setImportResults({
      success: 0,
      failed: 0,
      total: 0,
      completed: 0,
      errors: [],
      records: [],
    });
    setIsLoading(false);
  };

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('State updated:', {
      step,
      headersCount: headers.length,
      headers: headers,
      recordsCount: records.length,
      mappingKeys: Object.keys(mapping),
      isLoading,
    });
  }, [step, headers, records, mapping, isLoading]);

  console.log('Rendering BulkImportModal, current step:', step);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      console.log('Dialog open state changed:', open);
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Consultants</DialogTitle>
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
                  <li>Required columns: Name, Email, Role, Department</li>
                  <li>Optional columns: Position, Password</li>
                  <li>Empty rows will be automatically skipped</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'mapping' && headers.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map the columns from your file to the consultant fields. Fields marked with * are required.
              </p>

              <div className="bg-gray-50 border rounded-md p-3 text-sm">
                <strong>Found {headers.length} columns:</strong> {headers.join(', ')}
              </div>

              <div className="grid grid-cols-4 gap-4 font-medium border-b pb-2">
                <div>Field</div>
                <div className="col-span-3">Map to Column</div>
              </div>

              {['name', 'email', 'role', 'department', 'position', 'password'].map((field) => (
                <div key={field} className="grid grid-cols-4 gap-4 items-center">
                  <div className="capitalize font-medium">
                    {field} {['name', 'email', 'role', 'department'].includes(field) && <span className="text-red-500">*</span>}
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={mapping[field] || undefined}
                      onValueChange={(value) => {
                        if (value && value.trim() !== '') {
                          console.log(`Mapping ${field} to "${value}"`);
                          setMapping((prev) => ({ ...prev, [field]: value }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.filter((Boolean)).filter((h) => h.trim() !== '').map((header) => (
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

          {step === 'review' && records.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the data before importing. Showing preview of first 10 records.
              </p>

              <div className="border rounded-md max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {Object.keys(mapping).filter((k) => mapping[k]).map((field) => (
                        <TableHead key={field} className="capitalize">
                          {field}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 10).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        {Object.keys(mapping).filter((k) => mapping[k]).map((field) => (
                          <TableCell key={field} className="max-w-xs truncate">
                            {record[mapping[field]] || <span className="text-muted-foreground italic">empty</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {records.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={Object.keys(mapping).filter((k) => mapping[k]).length + 1} className="text-center text-sm text-muted-foreground">
                          + {records.length - 10} more records not shown
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm font-medium">
                  ✓ {records.length} records ready to import
                </p>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="flex items-center justify-center mb-2">
                  <Loader2 className={`h-8 w-8 animate-spin ${
                    importProgress === 100 
                      ? importResults.failed === 0 
                        ? 'text-green-500' 
                        : 'text-yellow-500'
                      : 'text-blue-500'
                  }`} />
                </div>
                <p className="text-lg font-medium mb-1">
                  Importing {importResults.completed} of {importResults.total} records
                </p>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${importProgress}%`,
                      backgroundColor: importProgress === 100 
                        ? (importResults.failed === 0 ? '#10B981' : '#F59E0B') 
                        : '#3B82F6',
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="text-green-600">
                    <CheckCircle className="inline w-4 h-4 mr-1" />
                    {importResults.success} Success
                  </span>
                  <span className="text-red-600">
                    <XCircle className="inline w-4 h-4 mr-1" />
                    {importResults.failed} Failed
                  </span>
                  <span className="text-blue-600">
                    <Loader2 className="inline w-4 h-4 mr-1 animate-spin" />
                    {importResults.total - importResults.completed} Pending
                  </span>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-medium">Import Progress</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importResults.records.map((record) => (
                        <tr key={record.index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {record.index + 1}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : record.status === 'importing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status === 'success' && (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              )}
                              {record.status === 'error' && (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {record.status === 'importing' && (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              )}
                              {record.status === 'pending' && (
                                <Clock className="w-3 h-3 mr-1" />
                              )}
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </span>
                            {record.status === 'error' && record.error && (
                              <div className="text-xs text-red-500 mt-1 truncate">
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

              {importResults.failed > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium mb-1">
                    <AlertTriangle className="inline w-4 h-4 mr-1" />
                    {importResults.failed} record{importResults.failed !== 1 ? 's' : ''} failed to import
                  </p>
                  <p className="text-xs">
                    Common issues: Duplicate emails, invalid data, or missing required fields
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fallback for unexpected states */}
          {!['upload', 'mapping', 'review', 'importing', 'complete'].includes(step) && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <p className="text-red-600">Unexpected state: {step}</p>
              <Button onClick={resetForm} className="mt-4">Reset</Button>
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
                onClick={() => {
                  console.log('Next button clicked, transitioning to mapping');
                  setStep('mapping');
                }} 
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
                onClick={() => {
                  if (validateMappings()) {
                    setStep('review');
                  }
                }}
                disabled={!mapping.name || !mapping.email || !mapping.role || !mapping.department}
              >
                Next: Review Data
              </Button>
            </>
          )}

          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Start Import'
                )}
              </Button>
            </>
          )}

          {step === 'complete' && (
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

export default BulkImportModal;