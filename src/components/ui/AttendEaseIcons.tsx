import React from 'react';

// Custom AttendEase Icon Components for Unique Brand Identity
// These icons combine modern design with HR/attendance-specific symbolism

export const AttendEaseLogo: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = "" 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 32 32" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer circle with gradient */}
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    
    {/* Main circle */}
    <circle cx="16" cy="16" r="14" fill="url(#logoGradient)" opacity="0.1"/>
    <circle cx="16" cy="16" r="14" stroke="url(#logoGradient)" strokeWidth="2" fill="none"/>
    
    {/* Clock face */}
    <circle cx="16" cy="16" r="8" stroke="url(#logoGradient)" strokeWidth="1.5" fill="none"/>
    
    {/* Clock hands - showing progress */}
    <line x1="16" y1="16" x2="16" y2="10" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="16" x2="20" y2="18" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round"/>
    
    {/* Person silhouette */}
    <circle cx="16" cy="12" r="2" fill="url(#logoGradient)" opacity="0.8"/>
    <path d="M 13 16 Q 16 14 19 16 L 19 20 Q 16 22 13 20 Z" fill="url(#logoGradient)" opacity="0.6"/>
    
    {/* Progress dots */}
    <circle cx="8" cy="8" r="1" fill="#10B981" className="animate-pulse"/>
    <circle cx="24" cy="8" r="1" fill="#10B981" className="animate-pulse" style={{animationDelay: '0.2s'}}/>
    <circle cx="8" cy="24" r="1" fill="#10B981" className="animate-pulse" style={{animationDelay: '0.4s'}}/>
    <circle cx="24" cy="24" r="1" fill="#10B981" className="animate-pulse" style={{animationDelay: '0.6s'}}/>
  </svg>
);

export const AttendanceIcon: React.FC<{ size?: number; className?: string; checked?: boolean }> = ({ 
  size = 24, 
  className = "",
  checked = false
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="attendanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    
    {/* Fingerprint pattern */}
    <path 
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" 
      fill={checked ? "url(#attendanceGradient)" : "currentColor"}
      opacity={checked ? 1 : 0.3}
    />
    
    {/* Clock hands */}
    <line 
      x1="12" y1="12" x2="12" y2="7" 
      stroke={checked ? "url(#attendanceGradient)" : "currentColor"}
      strokeWidth={2} 
      strokeLinecap="round"
      opacity={checked ? 1 : 0.5}
    />
    <line 
      x1="12" y1="12" x2="16" y2="14" 
      stroke={checked ? "url(#attendanceGradient)" : "currentColor"}
      strokeWidth={2} 
      strokeLinecap="round"
      opacity={checked ? 1 : 0.5}
    />
    
    {/* Check mark when checked */}
    {checked && (
      <path 
        d="M 8 12 L 11 15 L 16 8" 
        stroke="url(#attendanceGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-pulse"
      />
    )}
  </svg>
);

export const LeaveIcon: React.FC<{ size?: number; className?: string; approved?: boolean }> = ({ 
  size = 24, 
  className = "",
  approved = false
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="leaveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    
    {/* Calendar base */}
    <rect 
      x="3" y="4" width="18" height="18" rx="2" 
      fill={approved ? "url(#leaveGradient)" : "none"}
      stroke={approved ? "url(#leaveGradient)" : "currentColor"}
      strokeWidth={2}
      opacity={approved ? 0.2 : 1}
    />
    
    {/* Calendar header */}
    <rect x="3" y="4" width="18" height="6" rx="2" fill="url(#leaveGradient)" opacity={approved ? 0.3 : 0.1}/>
    
    {/* Calendar rings */}
    <rect x="8" y="2" width="2" height="4" rx="1" fill="url(#leaveGradient)"/>
    <rect x="14" y="2" width="2" height="4" rx="1" fill="url(#leaveGradient)"/>
    
    {/* Leave days highlighted */}
    <rect x="6" y="12" width="2" height="2" rx="0.5" fill={approved ? "url(#leaveGradient)" : "#F59E0B"}/>
    <rect x="10" y="12" width="2" height="2" rx="0.5" fill={approved ? "url(#leaveGradient)" : "#F59E0B"}/>
    <rect x="14" y="12" width="2" height="2" rx="0.5" fill={approved ? "url(#leaveGradient)" : "#F59E0B"}/>
    
    {/* Approval stamp */}
    {approved && (
      <circle cx="16" cy="16" r="4" fill="none" stroke="url(#leaveGradient)" strokeWidth={1.5} className="animate-pulse"/>
    )}
  </svg>
);

export const ProjectIcon: React.FC<{ size?: number; className?: string; active?: boolean }> = ({ 
  size = 24, 
  className = "",
  active = false
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="projectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
    
    {/* Project stack */}
    <rect x="4" y="8" width="16" height="12" rx="2" fill="url(#projectGradient)" opacity={active ? 0.3 : 0.1} stroke="url(#projectGradient)" strokeWidth={2}/>
    <rect x="6" y="6" width="16" height="12" rx="2" fill="url(#projectGradient)" opacity={active ? 0.2 : 0.05} stroke="url(#projectGradient)" strokeWidth={2}/>
    <rect x="8" y="4" width="16" height="12" rx="2" fill="url(#projectGradient)" opacity={active ? 0.1 : 0.02} stroke="url(#projectGradient)" strokeWidth={2}/>
    
    {/* Progress indicator */}
    {active && (
      <>
        <rect x="10" y="8" width="12" height="2" rx="1" fill="url(#projectGradient)" className="animate-pulse"/>
        <rect x="10" y="11" width="8" height="2" rx="1" fill="url(#projectGradient)" opacity={0.6}/>
        <rect x="10" y="14" width="10" height="2" rx="1" fill="url(#projectGradient)" opacity={0.4}/>
      </>
    )}
  </svg>
);

export const TeamIcon: React.FC<{ size?: number; className?: string; count?: number }> = ({ 
  size = 24, 
  className = "",
  count = 3
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="teamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
    
    {/* Team members */}
    <circle cx="12" cy="8" r="3" fill="url(#teamGradient)" opacity={0.8}/>
    <path d="M 6 16 Q 12 14 18 16 L 18 20 Q 12 22 6 20 Z" fill="url(#teamGradient)" opacity={0.6}/>
    
    {/* Additional team members */}
    {count > 1 && (
      <>
        <circle cx="6" cy="10" r="2" fill="url(#teamGradient)" opacity={0.4}/>
        <circle cx="18" cy="10" r="2" fill="url(#teamGradient)" opacity={0.4}/>
      </>
    )}
    
    {/* Connection lines */}
    <line x1="12" y1="11" x2="6" y2="12" stroke="url(#teamGradient)" strokeWidth={1} opacity={0.3}/>
    <line x1="12" y1="11" x2="18" y2="12" stroke="url(#teamGradient)" strokeWidth={1} opacity={0.3}/>
  </svg>
);

export const AnalyticsIcon: React.FC<{ size?: number; className?: string; animated?: boolean }> = ({ 
  size = 24, 
  className = "",
  animated = false
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="analyticsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    
    {/* Chart bars */}
    <rect x="4" y="12" width="3" height="8" rx="1" fill="url(#analyticsGradient)" opacity={0.6}/>
    <rect x="8" y="8" width="3" height="12" rx="1" fill="url(#analyticsGradient)" opacity={0.7}/>
    <rect x="12" y="6" width="3" height="14" rx="1" fill="url(#analyticsGradient)" opacity={0.8}/>
    <rect x="16" y="10" width="3" height="10" rx="1" fill="url(#analyticsGradient)" opacity={0.7}/>
    
    {/* Trend line */}
    <path d="M 5 14 L 9 10 L 13 8 L 17 12" stroke="url(#analyticsGradient)" strokeWidth={2} fill="none" strokeLinecap="round"/>
    
    {/* Animated pulse */}
    {animated && (
      <circle cx="17" cy="12" r="2" fill="none" stroke="url(#analyticsGradient)" strokeWidth={1.5} className="animate-ping"/>
    )}
  </svg>
);

export const NotificationIcon: React.FC<{ size?: number; className?: string; hasNotification?: boolean }> = ({ 
  size = 24, 
  className = "",
  hasNotification = false
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="notificationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    
    {/* Bell body */}
    <path 
      d="M 12 2 C 10.9 2 10 2.9 10 4 L 10 10 C 10 12.2 8.2 14 6 14 L 6 16 L 18 16 L 18 14 C 15.8 14 14 12.2 14 10 L 14 4 C 14 2.9 13.1 2 12 2 Z" 
      fill="currentColor"
      opacity={0.8}
    />
    
    {/* Bell clapper */}
    <circle cx="12" cy="18" r="1" fill="currentColor" opacity={0.6}/>
    
    {/* Notification dot */}
    {hasNotification && (
      <circle cx="18" cy="6" r="4" fill="url(#notificationGradient)" className="animate-pulse"/>
    )}
  </svg>
);

// Animated loading spinner
export const AttendEaseSpinner: React.FC<{ size?: number; className?: string }> = ({ 
  size = 24, 
  className = ""
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={`animate-spin ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0}/>
        <stop offset="50%" stopColor="#3B82F6" stopOpacity={1}/>
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/>
      </linearGradient>
    </defs>
    
    <circle 
      cx="12" cy="12" r="10" 
      stroke="url(#spinnerGradient)" 
      strokeWidth={2}
      strokeDasharray="31.416"
      strokeDashoffset="31.416"
      strokeLinecap="round"
    />
  </svg>
);

// Success checkmark with animation
export const SuccessIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 24, 
  className = ""
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    
    <circle cx="12" cy="12" r="10" fill="url(#successGradient)" opacity={0.1}/>
    <path 
      d="M 8 12 L 11 15 L 16 8" 
      stroke="url(#successGradient)" 
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-pulse"
    />
  </svg>
);
