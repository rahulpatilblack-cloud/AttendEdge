import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

const BackdatedLeave: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      const { data, error } = await supabase.from('leave_types').select('*');
      if (!error && data) {
        setLeaveTypes(data.filter((type: any) => type.is_active));
      }
    };
    fetchLeaveTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    if (!leaveTypeId) {
      setMessage('Please select a leave type.');
      setSubmitting(false);
      return;
    }
    if (new Date(startDate) > new Date() || new Date(endDate) > new Date()) {
      setMessage('Backdated leave must be for past dates only.');
      setSubmitting(false);
      return;
    }
    if (!currentCompany) {
      setMessage('Company information is missing.');
      setSubmitting(false);
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const { error } = await supabase.from('leave_requests').insert({
      employee_id: user.id,
      company_id: currentCompany.id,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      reason,
      status: 'pending',
    });

    if (error) {
      setMessage('Error submitting leave: ' + error.message);
    } else {
      setMessage('Backdated leave request submitted!');
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveTypeId('');
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4">
      <form className="max-w-md mx-auto space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-2">Request Backdated Leave</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Leave Type</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={leaveTypeId}
            onChange={e => setLeaveTypeId(e.target.value)}
            required
          >
            <option value="">Select leave type</option>
            {leaveTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={startDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={endDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setEndDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Backdated Leave'}
        </button>
        {message && <div className="mt-2 text-sm text-red-600">{message}</div>}
      </form>
    </div>
  );
};

export default BackdatedLeave; 