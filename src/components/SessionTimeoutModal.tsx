import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Shield } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

interface SessionTimeoutModalProps {
  open: boolean;
  onClose: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ open, onClose }) => {
  const { extendSession, logout, sessionTimeout, lastActivity } = useSession();
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Calculate time remaining
  useEffect(() => {
    if (!open) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      const remaining = Math.max(0, sessionTimeout - timeSinceLastActivity);
      setTimeRemaining(remaining);
    };

    // Update immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [open, lastActivity, sessionTimeout]);

  // Format time remaining
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Auto-close when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && open) {
      logout();
    }
  }, [timeRemaining, open, logout]);

  const handleExtendSession = () => {
    extendSession();
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            Session Timeout Warning
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-orange-50 rounded-lg">
            <Clock className="w-8 h-8 text-orange-500 mr-3" />
            <div className="text-center">
              <p className="text-sm text-gray-600">Your session will expire in</p>
              <p className="text-2xl font-bold text-orange-600">{formatTimeRemaining()}</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-700">
              For security reasons, your session will automatically expire due to inactivity.
            </p>
            <p className="text-sm text-gray-500">
              Click "Extend Session" to continue working, or you'll be logged out automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-blue-700">
              This helps protect your account and company data from unauthorized access.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleExtendSession}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Extend Session
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
            >
              Logout Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
