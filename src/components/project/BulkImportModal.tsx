// src/components/project/BulkImportModal.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

const BulkImportModal: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}> = ({ open, onOpenChange, onImportComplete }) => {
  const { addConsultant } = useAuth();
  const { currentCompany } = useCompany();
  const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[];
        const records = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 1 })
          .map((row, index) => {
            const record: any = { __rowNum__: index + 2 };
            headers.forEach((header, i) => {
              record[header] = row[i];
            });
            return record;
          })
          .filter(record => Object.values(record).some(val => val !== undefined && val !== ''));

        setHeaders(headers);
        setRecords(records);
        setStep('mapping');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    if (!validateMappings()) return;

    setStep('importing');
    const companyId = currentCompany?.id || '91fc12c5-61ad-4776-8685-2ab18ee01274';
    let successCount = 0;
    let failedCount = 0;

    for (const record of records) {
      try {
        const consultantData: Record<string, any> = {};
        
        // Map the record data based on the mapping
        for (const [field, sourceColumn] of Object.entries(mapping)) {
          if (sourceColumn && record[sourceColumn] !== undefined) {
            consultantData[field] = record[sourceColumn];
          }
        }

        // Set default values
        if (!consultantData.role) {
          consultantData.role = 'employee';
        }
        if (!consultantData.position) {
          consultantData.position = 'Consultant';
        }

        // Add the consultant
        const { success } = await addConsultant(
          consultantData.email,
          consultantData.password || 'Temp123!',
          consultantData.name,
          consultantData.role,
          companyId,
          consultantData.department || 'General'
        );

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Error importing record:', error);
        failedCount++;
      }
    }

    setImportResults({ success: successCount, failed: failedCount });
    setStep('complete');
    onImportComplete();
  };

  const validateMappings = () => {
    const requiredFields = ['name', 'email', 'role', 'department'];
    const missingFields = requiredFields.filter(field => !mapping[field]);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please map the following required fields: ${missingFields.join(', ')}`,
        variant: 'destructive'
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
    setImportResults({ success: 0, failed: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Consultants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {step === 'upload' && (
            <div 
              {...getRootProps()} 
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-accent/50"
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop the file here' : 'Drag & drop an Excel/CSV file here, or click to select'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xls, .xlsx, .csv files</p>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 font-medium border-b pb-2">
                <div>Field</div>
                <div className="col-span-3">Map to Column</div>
              </div>
              
              {['name', 'email', 'role', 'department', 'position'].map((field) => (
                <div key={field} className="grid grid-cols-4 gap-4 items-center">
                  <div className="capitalize">{field} {['name', 'email', 'role'].includes(field) && '*'}</div>
                  <div className="col-span-3">
                    <Select
                      value={mapping[field] || ''}
                      onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not Mapped --</SelectItem>
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

          {step === 'review' && (
            <div className="space-y-4">
              <div className="border rounded-md max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      {Object.keys(mapping).map((field) => (
                        <TableHead key={field} className="capitalize">
                          {field}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 10).map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        {Object.keys(mapping).map((field) => (
                          <TableCell key={field} className="max-w-xs truncate">
                            {record[mapping[field]]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {records.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={Object.keys(mapping).length + 1} className="text-center text-sm text-muted-foreground">
                          + {records.length - 10} more records not shown
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                {records.length} records will be imported.
              </p>
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-4 text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto animate-spin" />
              <p>Importing {records.length} consultants...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${((importResults.success + importResults.failed) / records.length) * 100}%` 
                  }} 
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Processed {importResults.success + importResults.failed} of {records.length} records
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-4 text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Import Complete</h3>
              <p className="text-sm text-muted-foreground">
                Successfully imported {importResults.success} out of {records.length} consultants.
              </p>
              {importResults.failed > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {importResults.failed} records failed to import.
                </div>
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
                disabled={!file}
              >
                Next
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
                disabled={!mapping.name || !mapping.email || !mapping.role}
              >
                Review Import
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