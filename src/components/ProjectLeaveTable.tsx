// components/ProjectLeaveTable.tsx
interface LeaveRecord {
  id: string;
  employeeName: string;
  clientName: string;
  endClientName: string;
  startDate: string;
  endDate: string;
  hours: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface ProjectLeaveTableProps {
  leaves: LeaveRecord[];
}