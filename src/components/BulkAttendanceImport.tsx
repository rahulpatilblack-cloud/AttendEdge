import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface BulkAttendanceImportProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  companyId: string;
  onImportComplete?: () => void;
}

interface ImportStats {
  processed: number;
  imported: number;
  failed: number;
  unmatched: number;
  multiple: number;
}

const BulkAttendanceImport: React.FC<BulkAttendanceImportProps> = ({ open, setOpen, companyId, onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importStats, setImportStats] = useState<ImportStats|null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportErrors([]);
    try {
      const workbook = await XLSX.read(await file.arrayBuffer());
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(worksheet);
      let success = 0, fail = 0;
      const errors: string[] = [];

      // Fetch active employees for name matching
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (empError || !employees) {
        toast({ title: 'Error', description: 'Could not fetch employee list', variant: 'destructive' });
        setImporting(false);
        return;
      }
      // Group records by name + date
      const grouped: Record<string, { name: string; date: string; times: string[] } > = {};
      for (const row of json as any[]) {
        if (!row['Name'] || !row['Log Date']) {
          errors.push(`Missing Name or Log Date in row: ${JSON.stringify(row)}`);
          fail++;
          continue;
        }
        // Parse date/time
        const logDate = new Date(row['Log Date']);
        if (isNaN(logDate.getTime())) {
          errors.push(`Invalid Log Date: ${row['Log Date']} in row: ${JSON.stringify(row)}`);
          fail++;
          continue;
        }
        const dateStr = logDate.toISOString().split('T')[0];
        const nameKey = row['Name'].toString().trim().toLowerCase();
        const groupKey = `${nameKey}__${dateStr}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = { name: row['Name'], date: dateStr, times: [] };
        }
        grouped[groupKey].times.push(logDate.toISOString());
      }
      // For each group, match name and import
      for (const groupKey in grouped) {
        const { name, date, times } = grouped[groupKey];
        const safeName = typeof name === 'string' ? name : String(name || '').trim();
        const nameKey = safeName.trim().toLowerCase();
        const matches = employees.filter((emp: any) => {
          const empSafe = typeof emp.name === 'string' ? emp.name : String(emp.name || '').trim();
          return empSafe.trim().toLowerCase() === nameKey;
        });
        if (matches.length !== 1) {
          errors.push(`Name '${name}' on ${date}: ${matches.length === 0 ? 'No match' : 'Multiple matches'} among active employees.`);
          fail++;
          continue;
        }
        // Sort times to get first (check-in) and last (check-out)
        const sortedTimes = times.sort();
        const checkIn = sortedTimes[0];
        const checkOut = sortedTimes[sortedTimes.length - 1];
        const { error } = await supabase.from('attendance').upsert({
          employee_id: matches[0].id,
          company_id: companyId,
          date: date,
          check_in_time: checkIn,
          check_out_time: checkOut,
          status: 'present', // Default to present for biometric import
          notes: 'Imported from biometric device',
        }, {
          onConflict: 'employee_id,date'
        });
        if (error) {
          errors.push(`Import failed for ${name} on ${date}: ${error.message}`);
          fail++;
        } else {
          success++;
        }
      }
      toast({
        title: 'Import Complete',
        description: `${success} records imported, ${fail} failed.`,
        variant: fail > 0 ? 'destructive' : 'default',
      });
      setImportErrors(errors);
      setImportStats({
        processed: Object.keys(grouped).length,
        imported: success,
        failed: fail,
        unmatched: errors.filter(e => e.includes('No match')).length,
        multiple: errors.filter(e => e.includes('Multiple matches')).length,
      });
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setImportErrors([err.message || 'Failed to import attendance.']);
    } finally {
      setImporting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Attendance</DialogTitle>
        </DialogHeader>
        <div className="mb-4">Upload an Excel or CSV file with columns: <b>Name, Log Date</b>.<br/>All other columns will be ignored. Name must match an active employee exactly.</div>
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={importing}
        />
        {importStats && (
          <div className="mt-2 text-sm text-gray-700">
            <div><b>Statistics:</b></div>
            <ul className="ml-4 list-disc">
              <li>Total records processed: {importStats.processed}</li>
              <li>Imported successfully: {importStats.imported}</li>
              <li>Failed: {importStats.failed}</li>
              <li>Unmatched names: {importStats.unmatched}</li>
              <li>Multiple matches: {importStats.multiple}</li>
            </ul>
          </div>
        )}
        {importErrors.length > 0 && (
          <div className="mt-2 text-red-600 text-sm max-h-40 overflow-y-auto">
            {importErrors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Select File'}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceImport;
