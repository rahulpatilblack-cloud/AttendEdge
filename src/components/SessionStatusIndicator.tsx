import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Shield, AlertTriangle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

export const SessionStatusIndicator: React.FC = () => {
  const { isSessionActive, lastActivity, sessionTimeout, extendSession } = useSession();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!isSessionActive) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      const remaining = Math.max(0, sessionTimeout - timeSinceLastActivity);
      setTimeRemaining(remaining);
    };

    // Update immediately
    calculateTimeRemaining();

    // Update every 30 seconds
    const interval = setInterval(calculateTimeRemaining, 30000);

    return () => clearInterval(interval);
  }, [isSessionActive, lastActivity, sessionTimeout]);

  // Format time remaining
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get status color and icon
  const getStatusInfo = () => {
    const minutesRemaining = Math.floor(timeRemaining / 60000);
    
    if (minutesRemaining <= 5) {
      return {
        color: 'bg-red-500',
        icon: AlertTriangle,
        text: 'Critical'
      };
    } else if (minutesRemaining <= 15) {
      return {
        color: 'bg-orange-500',
        icon: Clock,
        text: 'Warning'
      };
    } else {
      return {
        color: 'bg-green-500',
        icon: Shield,
        text: 'Active'
      };
    }
  };

  if (!isSessionActive) return null;

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${statusInfo.color} text-white hover:${statusInfo.color} cursor-pointer`}
              onClick={() => setShowTooltip(!showTooltip)}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.text}
            </Badge>
            
            <span className="text-xs text-gray-500 font-mono">
              {formatTimeRemaining()}
            </span>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="w-64">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Session Status:</span>
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.text}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Time Remaining:</span>
              <span className="font-mono">{formatTimeRemaining()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Activity:</span>
              <span className="text-sm">
                {lastActivity.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
            <div className="pt-2 border-t">
              <Button 
                size="sm" 
                onClick={extendSession}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Extend Session
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              Click anywhere on the page to reset the timer
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
