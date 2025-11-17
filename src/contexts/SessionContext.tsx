import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SessionContextType {
  isSessionActive: boolean;
  sessionTimeout: number;
  lastActivity: Date;
  resetSessionTimer: () => void;
  extendSession: () => void;
  logout: () => Promise<void>;
  showTimeoutWarning: boolean;
  setShowTimeoutWarning: (show: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { user, logout: authLogout } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // Session timeout in milliseconds (30 minutes)
  const sessionTimeout = 30 * 60 * 1000;
  
  // Warning time before timeout (5 minutes)
  const warningTime = 5 * 60 * 1000;

  // Reset session timer
  const resetSessionTimer = useCallback(() => {
    setLastActivity(new Date());
    setIsSessionActive(true);
    setShowTimeoutWarning(false);
  }, []);

  // Extend session
  const extendSession = useCallback(() => {
    resetSessionTimer();
    toast({
      title: "Session Extended",
      description: "Your session has been extended successfully",
    });
  }, [resetSessionTimer]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authLogout();
      setIsSessionActive(false);
      setLastActivity(new Date());
      setShowTimeoutWarning(false);
      toast({
        title: "Logged Out",
        description: "You have been logged out due to inactivity",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [authLogout]);

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    if (user) {
      resetSessionTimer();
    }
  }, [user, resetSessionTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) {
      setIsSessionActive(false);
      return;
    }

    setIsSessionActive(true);
    resetSessionTimer();

    // Activity events to listen for
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [user, handleUserActivity, resetSessionTimer]);

  // Session timeout management
  useEffect(() => {
    if (!user || !isSessionActive) return;

    const checkSessionTimeout = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      const timeUntilTimeout = sessionTimeout - timeSinceLastActivity;

      if (timeUntilTimeout <= 0) {
        // Session expired
        logout();
      } else if (timeUntilTimeout <= warningTime && !showTimeoutWarning) {
        // Show warning
        setShowTimeoutWarning(true);
        toast({
          title: "Session Timeout Warning",
          description: `Your session will expire in ${Math.ceil(timeUntilTimeout / 60000)} minutes. Click anywhere to extend.`,
          variant: "destructive",
        });
      }
    };

    // Check every minute
    const interval = setInterval(checkSessionTimeout, 60000);

    return () => clearInterval(interval);
  }, [user, isSessionActive, lastActivity, sessionTimeout, warningTime, showTimeoutWarning, logout]);

  // Auto-logout on tab/window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Set a flag in localStorage to indicate tab was closed
        localStorage.setItem('tabClosed', Date.now().toString());
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        // Tab became hidden, could be minimized or switched
        localStorage.setItem('tabHidden', Date.now().toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Check for tab closure on focus
  useEffect(() => {
    const handleFocus = () => {
      const tabClosed = localStorage.getItem('tabClosed');
      const tabHidden = localStorage.getItem('tabHidden');
      
      if (tabClosed && user) {
        const closedTime = parseInt(tabClosed);
        const now = Date.now();
        
        // If tab was closed more than 5 minutes ago, consider session expired
        if (now - closedTime > 5 * 60 * 1000) {
          logout();
        }
        
        localStorage.removeItem('tabClosed');
        localStorage.removeItem('tabHidden');
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, logout]);

  const value: SessionContextType = {
    isSessionActive,
    sessionTimeout,
    lastActivity,
    resetSessionTimer,
    extendSession,
    logout,
    showTimeoutWarning,
    setShowTimeoutWarning,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};
