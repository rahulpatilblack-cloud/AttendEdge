import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ open, onClose, onSuccess }) => {
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [step, setStep] = useState<'company' | 'enroll'>('company');
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const { createCompany, enrollUserInCompany } = useCompany();

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);
    const company = await createCompany(companyName, companyDomain);
    if (company) {
      setCreatedCompanyId(company.id);
      setCompanyLoading(false);
      setStep('enroll');
    } else {
      setCompanyLoading(false);
      alert('Failed to create company.');
    }
  };

  const handleEnroll = async () => {
    if (!user || !createdCompanyId) return;
    setEnrollLoading(true);
    const enrolled = await enrollUserInCompany(user.id, createdCompanyId);
    if (enrolled) {
      setOnboardingSuccess(true);
      setEnrollLoading(false);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } else {
      setEnrollLoading(false);
      alert('Failed to enroll user in company.');
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === 'company' ? 'Create Your Company' : 'Enroll in Company'}</DialogTitle>
        </DialogHeader>
        {step === 'company' ? (
          <form onSubmit={handleCompanyCreate} className="space-y-4">
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
              disabled={companyLoading}
            />
            <input
              type="text"
              placeholder="Company Domain (e.g. example.com)"
              value={companyDomain}
              onChange={e => setCompanyDomain(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
              disabled={companyLoading}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center"
                disabled={companyLoading}
              >
                {companyLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  'Create Company'
                )}
              </button>
              <button
                type="button"
                className="bg-gray-200 px-6 py-2 rounded"
                onClick={handleLogout}
                disabled={companyLoading}
              >
                Logout
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="text-lg font-semibold mb-2">Company created successfully!</div>
            <button
              className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50"
              onClick={handleEnroll}
              disabled={enrollLoading || onboardingSuccess}
            >
              {enrollLoading ? 'Enrolling...' : onboardingSuccess ? 'Enrolled!' : 'Enroll Me'}
            </button>
            <button
              className="bg-gray-200 px-6 py-2 rounded"
              onClick={handleLogout}
              disabled={enrollLoading}
            >
              Logout
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { OnboardingModal }; 