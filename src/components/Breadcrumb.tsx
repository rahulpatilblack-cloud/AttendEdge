import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<any>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  onNavigate, 
  className = "" 
}) => {
  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        onClick={() => onNavigate?.('dashboard')}
      >
        <Home className="w-4 h-4" />
      </Button>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;
        
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isLast 
                  ? 'text-blue-600 font-medium cursor-default hover:bg-transparent' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => !isLast && item.path && onNavigate?.(item.path)}
              disabled={isLast}
            >
              {Icon && <Icon className="w-4 h-4 mr-1" />}
              {item.label}
            </Button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Helper function to generate breadcrumb items based on current tab
export const getBreadcrumbItems = (activeTab: string): BreadcrumbItem[] => {
  const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
    'dashboard': [],
    'attendance': [
      { label: 'Attendance', path: 'attendance' }
    ],
    'manage-attendance': [
      { label: 'Attendance', path: 'attendance' },
      { label: 'Manage Attendance', path: 'manage-attendance' }
    ],
    'leave': [
      { label: 'Leave', path: 'leave' }
    ],
    'leave-management': [
      { label: 'Leave', path: 'leave' },
      { label: 'Manage Leave', path: 'leave-management' }
    ],
    'leave-type-management': [
      { label: 'Leave', path: 'leave' },
      { label: 'Leave Types', path: 'leave-type-management' }
    ],
    'holidays': [
      { label: 'Holidays', path: 'holidays' }
    ],
    'employees': [
      { label: 'Employees', path: 'employees' }
    ],
    'teams': [
      { label: 'Teams', path: 'teams' }
    ],
    'reports': [
      { label: 'Reports', path: 'reports' }
    ],
    'performance-report': [
      { label: 'Reports', path: 'reports' },
      { label: 'Performance Report', path: 'performance-report' }
    ],
    'recruitment-report': [
      { label: 'Reports', path: 'reports' },
      { label: 'Recruitment Report', path: 'recruitment-report' }
    ],
    'profile': [
      { label: 'Profile', path: 'profile' }
    ],
    'company-profile': [
      { label: 'Company Profile', path: 'company-profile' }
    ],
    'settings': [
      { label: 'Settings', path: 'settings' }
    ],
    'session-settings': [
      { label: 'Settings', path: 'settings' },
      { label: 'Session Settings', path: 'session-settings' }
    ]
  };

  return breadcrumbMap[activeTab] || [];
};
