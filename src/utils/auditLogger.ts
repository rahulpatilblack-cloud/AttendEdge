interface AuditLog {
  id: string;
  action: string;
  resource: string;
  userId: string;
  timestamp: string;
  details: Record<string, any>;
  userAgent?: string;
  ip?: string;
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  log(action: string, resource: string, userId: string, details: Record<string, any> = {}) {
    const logEntry: AuditLog = {
      id: crypto.randomUUID(),
      action,
      resource,
      userId,
      timestamp: new Date().toISOString(),
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      ip: details.ip || 'unknown'
    };

    this.logs.unshift(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('AUDIT:', logEntry);
    }

    // Store in localStorage for persistence
    try {
      const existingLogs = this.getStoredLogs();
      existingLogs.unshift(logEntry);
      const logsToStore = existingLogs.slice(0, 100); // Keep only last 100 in localStorage
      localStorage.setItem('audit_logs', JSON.stringify(logsToStore));
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
  }

  getLogs(): AuditLog[] {
    return [...this.logs];
  }

  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  getLogsByAction(action: string): AuditLog[] {
    return this.logs.filter(log => log.action === action);
  }

  getLogsByResource(resource: string): AuditLog[] {
    return this.logs.filter(log => log.resource === resource);
  }

  getStoredLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem('audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  loadStoredLogs() {
    const storedLogs = this.getStoredLogs();
    this.logs = [...storedLogs];
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }

  // Performance monitoring
  logQueryPerformance(query: string, duration: number, userId: string, recordCount: number = 0) {
    this.log('QUERY_PERFORMANCE', 'database', userId, {
      query,
      duration,
      recordCount,
      performance: duration > 1000 ? 'slow' : duration > 500 ? 'moderate' : 'fast'
    });
  }

  logUserAction(action: string, resource: string, userId: string, details: Record<string, any> = {}) {
    this.log(action, resource, userId, {
      ...details,
      type: 'user_action'
    });
  }

  logSystemEvent(event: string, details: Record<string, any> = {}) {
    this.log('SYSTEM_EVENT', 'system', 'system', {
      event,
      ...details,
      type: 'system_event'
    });
  }
}

export const auditLogger = new AuditLogger();

// Initialize with stored logs
if (typeof window !== 'undefined') {
  auditLogger.loadStoredLogs();
}

// React hook for audit logging
export const useAuditLogger = () => {
  const logUserAction = (action: string, resource: string, details: Record<string, any> = {}) => {
    // Get current user ID from auth context or localStorage
    const userId = localStorage.getItem('user_id') || 'anonymous';
    auditLogger.logUserAction(action, resource, userId, details);
  };

  const logPerformance = (query: string, duration: number, recordCount: number = 0) => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    auditLogger.logQueryPerformance(query, duration, userId, recordCount);
  };

  return {
    logUserAction,
    logPerformance,
    getLogs: auditLogger.getLogs.bind(auditLogger),
    getLogsByUser: auditLogger.getLogsByUser.bind(auditLogger),
    clearLogs: auditLogger.clearLogs.bind(auditLogger)
  };
};
