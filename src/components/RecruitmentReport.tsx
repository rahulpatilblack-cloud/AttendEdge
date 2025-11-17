
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import RecruitmentDashboard from './RecruitmentDashboard';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Column definitions are now handled by columnConfig

const getMonthOptions = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.map((m, i) => ({ label: m, value: i + 1 }));
};

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
};

type PeriodType = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

// Layout helpers for better fit and readability
const getHeaderClassForField = (field: string) => {
  const base = 'border border-gray-300 px-3 py-2 text-left text-xs font-semibold truncate';
  switch (field) {
    case 'team':
    case 'user_name':
      return `${base} w-[14%]`;
    case 'total_call_duration':
      return `${base} w-[10%] text-center`;
    case 'offered':
    case 'placed':
      return `${base} w-[16%]`;
    default:
      return `${base} w-[8%] text-center`;
  }
};

const getCellClassForField = (field: string) => {
  const base = 'border border-gray-300 px-3 py-2 text-xs align-top truncate';
  switch (field) {
    case 'team':
    case 'user_name':
      return `${base}`;
    case 'total_call_duration':
      return `${base} text-center`;
    case 'offered':
    case 'placed':
      return `${base} whitespace-pre-wrap break-words`;
    default:
      return `${base} text-center`;
  }
};

const isEditableField = ['monster', 'dice', 'linkedin_profiles_viewed', 'linkedin_inmails_sent',
  'total_calls', 'total_submissions', 'total_interviews', 'offers', 'starts', 'offered', 'placed'];

// Define column configuration type
type ColumnConfig = {
  id: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  isNumeric?: boolean;
};

const RecruitmentReport: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const today = new Date();
  const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
  const prevMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  const [month, setMonth] = useState(prevMonth);
  const [year, setYear] = useState(prevMonthYear);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [quarter, setQuarter] = useState<number>(1);
  const [half, setHalf] = useState<number>(1);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'team' | 'individual'>('team');
  const [teamLookup, setTeamLookup] = useState<Record<string, string>>({});
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});
  const [userNameToUserId, setUserNameToUserId] = useState<Record<string, string>>({});
  const [userIdToTeamId, setUserIdToTeamId] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'upsert' | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState<'replace' | 'upsert' | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Column visibility and sorting
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    team: true,
    user_name: true,
    monster: true,
    dice: true,
    linkedin_profiles_viewed: true,
    linkedin_inmails_sent: true,
    total_calls: true,
    total_call_duration: true,
    total_submissions: true,
    total_interviews: true,
    offers: true,
    starts: true,
    offered: true,
    placed: true,
  });
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Fetch teams and users for lookup
  useEffect(() => {
    const fetchLookups = async () => {
      if (!currentCompany?.id) return;
      // Fetch teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', currentCompany.id);
      // Fetch employees
      const { data: users } = await supabase
        .from('employees')
        .select('id, name, team_id')
        .eq('company_id', currentCompany.id);
      // Build lookup maps
      const teamMap: Record<string, string> = {};
      (teams || []).forEach((t: any) => { teamMap[t.id] = t.name; });
      setTeamLookup(teamMap);
      const userMap: Record<string, string> = {};
      const userNameMap: Record<string, string> = {};
      const userTeamMap: Record<string, string> = {};
      (users || []).forEach((u: any) => {
        userMap[u.id] = u.name;
        userNameMap[u.name] = u.id;
        userTeamMap[u.id] = u.team_id;
      });
      setUserLookup(userMap);
      setUserNameToUserId(userNameMap);
      setUserIdToTeamId(userTeamMap);
    };

    fetchLookups();
  }, [currentCompany?.id]);

  // Fetch performance data for recruitment dashboard
  const fetchReports = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('performance_reports')
        .select('*')
        .eq('company_id', currentCompany.id);

      // Apply date filters based on period type (copy logic from PerformanceReport)
      let startDate, endDate;
      if (periodType === 'monthly') {
        startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        endDate = `${year}-${month.toString().padStart(2, '0')}-28`;
      } else if (periodType === 'quarterly') {
        if (quarter === 1) {
          startDate = `${year}-01-01`;
          endDate = `${year}-03-31`;
        } else if (quarter === 2) {
          startDate = `${year}-04-01`;
          endDate = `${year}-06-30`;
        } else if (quarter === 3) {
          startDate = `${year}-07-01`;
          endDate = `${year}-09-30`;
        } else if (quarter === 4) {
          startDate = `${year}-10-01`;
          endDate = `${year}-12-31`;
        }
      } else if (periodType === 'half-yearly') {
        if (half === 1) {
          startDate = `${year}-01-01`;
          endDate = `${year}-06-30`;
        } else if (half === 2) {
          startDate = `${year}-07-01`;
          endDate = `${year}-12-31`;
        }
      } else if (periodType === 'yearly') {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }

      query = query
        .gte('report_date', startDate)
        .lte('report_date', endDate);

      // Apply filters
      if (selectedTeam && selectedTeam !== 'all') {
        query = query.eq('team_id', selectedTeam);
      }
      if (selectedUser && selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching performance reports:', error);
        toast({
          title: "Error",
          description: "Failed to fetch performance data",
          variant: "destructive",
        });
        return;
      }
      const rows = data || [];

      const durationToSeconds = (d: string) => {
        if (!d) return 0;
        const [h, m, s] = d.split(':').map((n) => parseInt((n as any) || '0', 10));
        return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
      };
      const isAllThreeZero = (r: any) => {
        const calls = Number(r?.total_calls) || 0;
        const subs = Number(r?.total_submissions) || 0;
        const dur = durationToSeconds(r?.total_call_duration || '0:00:00');
        return calls === 0 && subs === 0 && dur === 0;
      };

      if (periodType === 'monthly') {
        const filtered = rows.filter((r: any) => !isAllThreeZero(r));
        setReportData(filtered);
      } else {
        const aggregateByUser: Record<string, any> = {};
        const numericFields = [
          'monster','dice','linkedin_profiles_viewed','linkedin_inmails_sent','total_calls',
          'total_submissions','total_interviews','offers','starts'
        ];

        const secondsToDuration = (sec: number) => {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = sec % 60;
          return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const normalizeList = (value: any): string[] => {
          if (!value && value !== 0) return [];
          if (value === 0 || value === '0') return [];
          if (Array.isArray(value)) {
            return value
              .map((v) => (v ?? '').toString().trim())
              .filter((v) => v && v !== '0');
          }
          const asString = (value ?? '').toString();
          return asString
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v && v !== '0');
        };

        rows.forEach((row: any) => {
          const userId = row.user_id;
          if (!aggregateByUser[userId]) {
            aggregateByUser[userId] = {
              ...row,
              team_id: userIdToTeamId[userId] || row.team_id,
              offered: normalizeList(row.offered).join(', '),
              placed: normalizeList(row.placed).join(', '),
            };
          } else {
            numericFields.forEach((f) => {
              aggregateByUser[userId][f] = (aggregateByUser[userId][f] || 0) + (row[f] || 0);
            });
            const prevSec = durationToSeconds(aggregateByUser[userId].total_call_duration);
            const addSec = durationToSeconds(row.total_call_duration);
            aggregateByUser[userId].total_call_duration = secondsToDuration(prevSec + addSec);

            // Merge offered/placed text lists de-duplicated
            const prevOffered = new Set(normalizeList(aggregateByUser[userId].offered));
            const nextOffered = normalizeList(row.offered);
            nextOffered.forEach((n) => prevOffered.add(n));
            aggregateByUser[userId].offered = Array.from(prevOffered).join(', ');

            const prevPlaced = new Set(normalizeList(aggregateByUser[userId].placed));
            const nextPlaced = normalizeList(row.placed);
            nextPlaced.forEach((n) => prevPlaced.add(n));
            aggregateByUser[userId].placed = Array.from(prevPlaced).join(', ');
          }
        });
        const aggregated = Object.values(aggregateByUser);
        const filteredAgg = aggregated.filter((r: any) => !isAllThreeZero(r));
        setReportData(filteredAgg);
      }
    } catch (error) {
      console.error('Error fetching performance reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentCompany?.id, month, year, periodType, quarter, half, selectedTeam, selectedUser]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportDialogOpen(true);
  };

  const parseNumber = (val: any) => {
    const num = typeof val === 'string' ? parseFloat(val.trim()) : Number(val);
    return isNaN(num) ? 0 : num;
  };

  const parseTextAvoidZero = (val: any) => {
    if (val === null || val === undefined) return null as unknown as string;
    if (Array.isArray(val)) {
      const parts = val
        .map((v) => (v ?? '').toString().trim())
        .filter((v) => v && v !== '0');
      return parts.length ? parts.join(', ') as unknown as string : null as unknown as string;
    }
    const str = (val ?? '').toString().trim();
    if (!str || str === '0') return null as unknown as string;
    return str as unknown as string;
  };

  const processImport = async (mode: 'replace' | 'upsert') => {
    if (!importFile) return;

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedData = jsonData.map((row: any) => {
        const teamName = row['Team'] || '';
        const userName = row['USER NAME'] || '';
        const teamId = Object.keys(teamLookup).find(key => teamLookup[key] === teamName) || '';
        const userId = userNameToUserId[userName] || '';
        
        return {
          team_id: teamId,
          user_id: userId,
          monster: parseNumber(row['Monster']),
          dice: parseNumber(row['Dice']),
          linkedin_profiles_viewed: parseNumber(row['LinkedIn Profiles viewed']),
          linkedin_inmails_sent: parseNumber(row['LinkedIn InMails sent']),
          total_calls: parseNumber(row['Total Calls']),
          total_call_duration: row['Total Call Duration'] || '',
          total_submissions: parseNumber(row['Total Submissions']),
          total_interviews: parseNumber(row['Total Interviews']),
          offers: parseNumber(row['Offers']),
          starts: parseNumber(row['Starts']),
          offered: parseTextAvoidZero(row['Offered']),
          placed: parseTextAvoidZero(row['Placed']),
          report_date: `${year}-${month.toString().padStart(2, '0')}-28`,
          company_id: currentCompany?.id,
        };
      });

      setImportPreview(processedData);
      setReviewData(processedData);
      setReviewMode(mode);
      setReviewDialogOpen(true);
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Error processing import:', error);
      toast({
        title: "Error",
        description: "Failed to process import file",
        variant: "destructive",
      });
    }
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const updatedData = [...reportData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [field]: value };
    setReportData(updatedData);
  };

  const saveCellEdit = async (rowIndex: number, field: string) => {
    if (!editingCell) return;

    try {
      const numericFields = new Set(['monster','dice','linkedin_profiles_viewed','linkedin_inmails_sent','total_calls','total_submissions','total_interviews','offers','starts']);
      let valueToSave: any;
      if (numericFields.has(field)) {
        const n = Number(editValue);
        valueToSave = isNaN(n) ? null : n;
      } else if (field === 'offered' || field === 'placed') {
        const str = (editValue ?? '').toString().trim();
        valueToSave = (str && str !== '0') ? str : null;
      } else {
        valueToSave = editValue;
      }
      const { error } = await supabase
        .from('performance_reports')
        .update({ [field]: valueToSave })
        .eq('id', reportData[rowIndex].id);

      if (error) {
        console.error('Error updating cell:', error);
        toast({
          title: "Error",
          description: "Failed to update data",
          variant: "destructive",
        });
        return;
      }

      handleCellEdit(rowIndex, field, valueToSave);
      setEditingCell(null);
      setEditValue('');
      toast({
        title: "Success",
        description: "Data updated successfully",
      });
    } catch (error) {
      console.error('Error saving cell edit:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const startEditing = (rowIndex: number, field: string, value: any) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value?.toString() || '');
  };

  const handleSaveImport = async () => {
    if (!reviewData.length) return;

    setSaving(true);
    try {
      if (reviewMode === 'replace') {
                 // Delete existing data for the period
         const startDate = new Date(year, month - 1, 1);
         const endDate = new Date(year, month - 1, 28);
        
        await supabase
          .from('performance_reports')
          .delete()
          .eq('company_id', currentCompany?.id)
          .gte('report_date', startDate.toISOString().split('T')[0])
          .lte('report_date', endDate.toISOString().split('T')[0]);
      }

      // Insert new data
      const { error } = await supabase
        .from('performance_reports')
        .insert(reviewData);

      if (error) {
        console.error('Error saving import:', error);
        toast({
          title: "Error",
          description: "Failed to save imported data",
          variant: "destructive",
        });
        return;
      }

      setReviewDialogOpen(false);
      setReviewData([]);
      setReviewMode(null);
      fetchReports();
      
      toast({
        title: "Success",
        description: "Data imported successfully",
      });
    } catch (error) {
      console.error('Error saving import:', error);
      toast({
        title: "Error",
        description: "Failed to save imported data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting to data
  const sortedData = useMemo(() => {
    if (!sortConfig) return reportData;
    
    return [...reportData].sort((a, b) => {
      // Handle team and user name sorting separately
      if (sortConfig.key === 'team') {
        const teamA = teamLookup[a.team_id] || '';
        const teamB = teamLookup[b.team_id] || '';
        return sortConfig.direction === 'asc' 
          ? teamA.localeCompare(teamB)
          : teamB.localeCompare(teamA);
      }
      
      if (sortConfig.key === 'user_name') {
        const userA = userLookup[a.user_id] || '';
        const userB = userLookup[b.user_id] || '';
        return sortConfig.direction === 'asc'
          ? userA.localeCompare(userB)
          : userB.localeCompare(userA);
      }
      
      // Handle numeric fields
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];
      
      if (valueA === valueB) return 0;
      if (valueA == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueB == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      return sortConfig.direction === 'asc'
        ? valueA > valueB ? 1 : -1
        : valueA < valueB ? 1 : -1;
    });
  }, [reportData, sortConfig, teamLookup, userLookup]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderEditableCell = (rowIndex: number, field: string, value: any, row: any) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveCellEdit(rowIndex, field);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
                setEditValue('');
              }
            }}
            className="w-20 h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => saveCellEdit(rowIndex, field)}
            className="h-6 px-2"
            variant="ghost"
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingCell(null);
              setEditValue('');
            }}
            className="h-6 px-2"
          >
            ✕
          </Button>
        </div>
      );
    }

    const displayValue = (v: any, f: string) => {
      if ((f === 'offered' || f === 'placed') && (v === 0 || v === '0')) return '';
      return v ?? '';
    };
    
    return (
      <div
        className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[2rem] flex items-center"
        onClick={() => startEditing(rowIndex, field, value)}
      >
        {displayValue(value, field)}
      </div>
    );
  };
  
  // Column configuration
  const columnConfig: ColumnConfig[] = [
    { id: 'team', label: 'Team', visible: columnVisibility.team, sortable: true },
    { id: 'user_name', label: 'User Name', visible: columnVisibility.user_name, sortable: true },
    { id: 'monster', label: 'Monster', visible: columnVisibility.monster, sortable: true, isNumeric: true },
    { id: 'dice', label: 'Dice', visible: columnVisibility.dice, sortable: true, isNumeric: true },
    { id: 'linkedin_profiles_viewed', label: 'LinkedIn Profiles', visible: columnVisibility.linkedin_profiles_viewed, sortable: true, isNumeric: true },
    { id: 'linkedin_inmails_sent', label: 'LinkedIn InMails', visible: columnVisibility.linkedin_inmails_sent, sortable: true, isNumeric: true },
    { id: 'total_calls', label: 'Total Calls', visible: columnVisibility.total_calls, sortable: true, isNumeric: true },
    { id: 'total_call_duration', label: 'Call Duration', visible: columnVisibility.total_call_duration, sortable: true },
    { id: 'total_submissions', label: 'Submissions', visible: columnVisibility.total_submissions, sortable: true, isNumeric: true },
    { id: 'total_interviews', label: 'Interviews', visible: columnVisibility.total_interviews, sortable: true, isNumeric: true },
    { id: 'offers', label: 'Offers', visible: columnVisibility.offers, sortable: true, isNumeric: true },
    { id: 'starts', label: 'Starts', visible: columnVisibility.starts, sortable: true, isNumeric: true },
    { id: 'offered', label: 'Offered', visible: columnVisibility.offered, sortable: false },
    { id: 'placed', label: 'Placed', visible: columnVisibility.placed, sortable: false },
  ];
  
  const visibleColumns = columnConfig.filter(col => col.visible);

  if (!currentCompany?.moduleSettings?.performance_report_enabled) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <h2 className="text-2xl font-bold mb-4">Performance Report Module Disabled</h2>
        <p className="text-gray-600">The performance report module is not enabled for your company.</p>
      </div>
    );
  }

  if (!['admin', 'super_admin', 'reporting_manager'].includes(user?.role)) {
    return (
      <div className="glass-effect rounded-2xl p-8 border text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the recruitment reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Recruitment Report</h1>
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            Import Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={(value: PeriodType) => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'monthly' && (
              <div className="flex-1 min-w-[120px]">
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'quarterly' && (
              <div className="flex-1 min-w-[100px]">
                <Label>Quarter</Label>
                <Select value={quarter.toString()} onValueChange={(value) => setQuarter(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'half-yearly' && (
              <div className="flex-1 min-w-[120px]">
                <Label>Half Year</Label>
                <Select value={half.toString()} onValueChange={(value) => setHalf(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">H1</SelectItem>
                    <SelectItem value="2">H2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[100px]">
              <Label>Year</Label>
              <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Label>Filter By</Label>
              <Select value={filterMode} onValueChange={(value: 'team' | 'individual') => setFilterMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterMode === 'team' && (
              <div className="flex-1 min-w-[180px]">
                <Label>Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {Object.entries(teamLookup).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name.replace(/^Recruitment\s*/i, '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterMode === 'individual' && (
              <div className="flex-1 min-w-[180px]">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {Object.entries(userLookup).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <RecruitmentDashboard performanceData={reportData} />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Performance Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(paginatedData.length, rowsPerPage)} of {reportData.length} records
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="rows-per-page" className="text-sm font-normal">Rows per page:</Label>
                  <Select
                    value={rowsPerPage.toString()}
                    onValueChange={(value) => {
                      setRowsPerPage(Number(value));
                      setCurrentPage(1); // Reset to first page when changing rows per page
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={rowsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto h-8">
                      Columns <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
                    {columnConfig.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={columnVisibility[column.id]}
                        onCheckedChange={(value) =>
                          setColumnVisibility(prev => ({
                            ...prev,
                            [column.id]: value
                          }))
                        }
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map((column) => (
                          <TableHead key={column.id} className={getHeaderClassForField(column.id)}>
                            <div className="flex items-center">
                              {column.sortable ? (
                                <button
                                  onClick={() => handleSort(column.id)}
                                  className="flex items-center font-semibold hover:text-primary focus:outline-none"
                                >
                                  {column.label}
                                  <ArrowUpDown className="ml-2 h-4 w-4" />
                                </button>
                              ) : (
                                column.label
                              )}
                              {sortConfig?.key === column.id && (
                                <span className="ml-1">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="hover:bg-gray-50">
                            {visibleColumns.map((column) => {
                              let value = row[column.id];
                              
                              // Map team_id and user_id to names
                              if (column.id === 'team') {
                                const teamName = teamLookup[row.team_id] || 'Unknown';
                                // Remove 'Recruitment' prefix if it exists
                                value = teamName.replace(/^Recruitment\s*/i, '');
                              } else if (column.id === 'user_name') {
                                value = userLookup[row.user_id] || 'Unknown';
                              }
                              
                              const isEditable = isEditableField.includes(column.id);
                              
                              return (
                                <TableCell key={column.id} className={getCellClassForField(column.id)}>
                                  {periodType === 'monthly' && isEditable
                                    ? renderEditableCell(
                                        rowIndex + ((currentPage - 1) * rowsPerPage),
                                        column.id,
                                        value,
                                        row
                                      )
                                    : (column.id === 'offered' || column.id === 'placed') && (value === 0 || value === '0')
                                      ? ''
                                      : (value || '')}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                            No results found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              className="w-10 h-10 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Performance Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Choose how to import the data:</p>
            <div className="flex space-x-2">
              <Button onClick={() => processImport('replace')}>
                Replace Existing Data
              </Button>
              <Button onClick={() => processImport('upsert')}>
                Add to Existing Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Import Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {columnConfig.map((column) => (
                      <th key={column.id} className="border border-gray-300 px-2 py-1 text-left text-xs">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {columnConfig.map((column) => (
                        <td key={column.id} className="border border-gray-300 px-2 py-1 text-xs">
                          {row[column.id] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveImport} disabled={saving}>
                {saving ? 'Saving...' : 'Save Data'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruitmentReport; 