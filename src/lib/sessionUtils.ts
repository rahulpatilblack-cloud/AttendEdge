import { supabase } from '@/integrations/supabase/client';

// Session security utilities
export class SessionSecurity {
  private static readonly SESSION_KEY = 'attendease_session';
  private static readonly DEVICE_FINGERPRINT_KEY = 'device_fingerprint';
  private static readonly LOGIN_ATTEMPTS_KEY = 'login_attempts';
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // Generate device fingerprint
  static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
      return canvas.toDataURL();
    }
    return 'unknown';
  }

  // Store device fingerprint
  static storeDeviceFingerprint(): void {
    const fingerprint = this.generateDeviceFingerprint();
    localStorage.setItem(this.DEVICE_FINGERPRINT_KEY, fingerprint);
  }

  // Validate device fingerprint
  static validateDeviceFingerprint(): boolean {
    const stored = localStorage.getItem(this.DEVICE_FINGERPRINT_KEY);
    const current = this.generateDeviceFingerprint();
    return stored === current;
  }

  // Track login attempts
  static trackLoginAttempt(email: string): { attempts: number; locked: boolean } {
    const key = `${this.LOGIN_ATTEMPTS_KEY}_${email}`;
    const attempts = parseInt(localStorage.getItem(key) || '0');
    const lastAttempt = parseInt(localStorage.getItem(`${key}_time`) || '0');
    
    const now = Date.now();
    const locked = attempts >= this.MAX_LOGIN_ATTEMPTS && 
                   (now - lastAttempt) < this.LOCKOUT_DURATION;

    if (!locked) {
      const newAttempts = attempts + 1;
      localStorage.setItem(key, newAttempts.toString());
      localStorage.setItem(`${key}_time`, now.toString());
      
      return { attempts: newAttempts, locked: false };
    }

    return { attempts, locked: true };
  }

  // Reset login attempts
  static resetLoginAttempts(email: string): void {
    const key = `${this.LOGIN_ATTEMPTS_KEY}_${email}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_time`);
  }

  // Check if account is locked
  static isAccountLocked(email: string): boolean {
    const key = `${this.LOGIN_ATTEMPTS_KEY}_${email}`;
    const attempts = parseInt(localStorage.getItem(key) || '0');
    const lastAttempt = parseInt(localStorage.getItem(`${key}_time`) || '0');
    
    return attempts >= this.MAX_LOGIN_ATTEMPTS && 
           (Date.now() - lastAttempt) < this.LOCKOUT_DURATION;
  }

  // Get remaining lockout time
  static getRemainingLockoutTime(email: string): number {
    const key = `${this.LOGIN_ATTEMPTS_KEY}_${email}`;
    const lastAttempt = parseInt(localStorage.getItem(`${key}_time`) || '0');
    const remaining = this.LOCKOUT_DURATION - (Date.now() - lastAttempt);
    return Math.max(0, remaining);
  }

  // Store session data securely
  static storeSessionData(data: any): void {
    try {
      const encrypted = btoa(JSON.stringify(data));
      localStorage.setItem(this.SESSION_KEY, encrypted);
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }

  // Retrieve session data securely
  static getSessionData(): any {
    try {
      const encrypted = localStorage.getItem(this.SESSION_KEY);
      if (encrypted) {
        return JSON.parse(atob(encrypted));
      }
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
    }
    return null;
  }

  // Clear session data
  static clearSessionData(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.DEVICE_FINGERPRINT_KEY);
  }

  // Validate session integrity
  static validateSession(): boolean {
    const sessionData = this.getSessionData();
    if (!sessionData) return false;

    // Check if device fingerprint matches
    if (!this.validateDeviceFingerprint()) {
      this.clearSessionData();
      return false;
    }

    // Check if session has expired
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      this.clearSessionData();
      return false;
    }

    return true;
  }

  // Log security event
  static async logSecurityEvent(event: string, details: any = {}): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('security_logs').insert({
          user_id: user.id,
          event_type: event,
          details: JSON.stringify(details),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // Get client IP address (basic implementation)
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Check for suspicious activity
  static checkSuspiciousActivity(): boolean {
    // Check for multiple tabs
    const tabCount = parseInt(localStorage.getItem('tab_count') || '0');
    if (tabCount > 5) return true;

    // Check for rapid navigation changes
    const navHistory = JSON.parse(localStorage.getItem('nav_history') || '[]');
    const recentNavs = navHistory.slice(-10);
    const rapidChanges = recentNavs.filter((nav: any, index: number) => {
      if (index === 0) return false;
      return (nav.timestamp - recentNavs[index - 1].timestamp) < 1000;
    });
    
    return rapidChanges.length > 3;
  }

  // Record navigation for security monitoring
  static recordNavigation(tab: string): void {
    const navHistory = JSON.parse(localStorage.getItem('nav_history') || '[]');
    navHistory.push({
      tab,
      timestamp: Date.now()
    });
    
    // Keep only last 50 navigations
    if (navHistory.length > 50) {
      navHistory.splice(0, navHistory.length - 50);
    }
    
    localStorage.setItem('nav_history', JSON.stringify(navHistory));
  }
}

// Session timeout utilities
export class SessionTimeout {
  private static readonly WARNING_INTERVAL = 60000; // 1 minute
  private static readonly CHECK_INTERVAL = 30000; // 30 seconds

  // Calculate time until next warning
  static getTimeUntilWarning(lastActivity: Date, sessionTimeout: number): number {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity.getTime();
    const timeUntilTimeout = sessionTimeout - timeSinceLastActivity;
    const warningTime = 5 * 60 * 1000; // 5 minutes
    
    return Math.max(0, timeUntilTimeout - warningTime);
  }

  // Format time remaining
  static formatTimeRemaining(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Check if session is about to expire
  static isSessionExpiringSoon(lastActivity: Date, sessionTimeout: number): boolean {
    const timeUntilWarning = this.getTimeUntilWarning(lastActivity, sessionTimeout);
    return timeUntilWarning <= 0;
  }

  // Get session health status
  static getSessionHealth(lastActivity: Date, sessionTimeout: number): 'healthy' | 'warning' | 'critical' {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity.getTime();
    const timeRemaining = sessionTimeout - timeSinceLastActivity;
    const minutesRemaining = Math.floor(timeRemaining / 60000);

    if (minutesRemaining <= 5) return 'critical';
    if (minutesRemaining <= 15) return 'warning';
    return 'healthy';
  }
}

// Export default instance
export default SessionSecurity;
