import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Building2, 
  Building,
  Calendar, 
  CalendarDays, 
  CalendarPlus, 
  ChevronDown,
  ChevronRight,
  Clock, 
  Eye,
  EyeOff,
  FileSpreadsheet, 
  FlaskConical,
  Lock, 
  LogOut, 
  Mail, 
  Menu, 
  Moon, 
  Network, 
  Settings, 
  Shield, 
  Sun, 
  TrendingUp, 
  User, 
  UserCheck, 
  UserCircle, 
  Users,
  ClipboardList,
  BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CompanyLogo from './CompanyLogo';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP_NAME } from "../branding";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: string[];
  requiresPermission?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const { sidebarPosition, theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // Track which section is currently open (null if none)
  const [openSection, setOpenSection] = useState<string | null>(null);
  
  // Toggle a section open/closed, closing others
  const toggleSection = (section: string) => {
    setOpenSection(current => current === section ? null : section);
  };
  
  // Check if a section is open
  const isSectionOpen = (section: string) => openSection === section;
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  // Enhanced navigation items with role-based access control
  const navigationItems: NavigationItem[] = [
    // Core features - available to all users
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Building2,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
      roles: ['reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'leave',
      label: 'Leave Requests',
      icon: Calendar,
      roles: ['reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'manage-attendance',
      label: 'Manage Attendance',
      icon: UserCheck,
      roles: ['reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'leave-management',
      label: 'Manage Leave Requests',
      icon: ClipboardList,
      roles: ['reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'holidays',
      label: 'Holidays',
      icon: CalendarDays,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'teams',
      label: 'Team Management',
      icon: Network,
      roles: ['admin', 'super_admin', 'reporting_manager'],
      requiresPermission: true
    },
    {
      id: 'employees',
      label: 'Employee Management',
      icon: Users,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'profile-management',
      label: 'Profile Management',
      icon: UserCircle,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['admin', 'super_admin', 'reporting_manager'],
      requiresPermission: true
    },
    {
      id: 'performance-report',
      label: 'Performance Report',
      icon: BarChart3,
      roles: ['admin', 'super_admin', 'reporting_manager'],
      requiresPermission: true
    },
    {
      id: 'recruitment-report',
      label: 'Recruitment Report',
      icon: BarChart3,
      roles: ['admin', 'super_admin', 'reporting_manager', 'recruiter'],
      requiresPermission: true
    },
    
    // Project Management section
    {
      id: 'my-projects',
      label: 'My Projects',
      icon: Briefcase,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'manage-projects',
      label: 'Manage Projects',
      icon: Briefcase,
      roles: ['admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'project-leave',
      label: 'Project Leave',
      icon: CalendarPlus,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'manage-project-leave',
      label: 'Manage Project Leave',
      icon: ClipboardList,
      roles: ['reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    },
    {
      id: 'project-holidays',
      label: 'Project Holidays',
      icon: CalendarDays,
      roles: ['employee', 'reporting_manager', 'admin', 'super_admin']
    },
    {
      id: 'project-reports',
      label: 'Project Leave Reports',
      icon: BarChart3,
      roles: ['reporting_manager', 'admin', 'super_admin'],
      requiresPermission: true
    },
    // Settings moved to Management section
  ].filter(item => item.id !== 'dummy-attendance' && item.id !== 'company-profile' && item.id !== 'leave-type-management');

  // Filter navigation items based on user role and enforce order for leave/leave-management
  const getFilteredNavigationItems = () => {
    if (!user) return [];
    // Remove performance-report if not enabled for the company
    let filteredNavItems = currentCompany?.moduleSettings?.performance_report_enabled
      ? navigationItems
      : navigationItems.filter(item => item.id !== 'performance-report');
    
    // Remove recruitment-report if not enabled for the company (uses performance report module)
    filteredNavItems = currentCompany?.moduleSettings?.performance_report_enabled
      ? filteredNavItems
      : filteredNavItems.filter(item => item.id !== 'recruitment-report');
    // Always keep the first 4 tabs in order, then conditionally add the 5th
    const baseTabs = filteredNavItems.slice(0, 4).filter(item => item.roles.includes(user.role || 'employee'));
    const manageLeaveTab = filteredNavItems[4];
    const restTabs = filteredNavItems.slice(5).filter(item => item.roles.includes(user.role || 'employee'));
    let result = [...baseTabs];
    if (manageLeaveTab && manageLeaveTab.roles.includes(user.role || 'employee')) {
      result.push(manageLeaveTab);
    }
    result = [...result, ...restTabs];
    // Remove HR/Management tools from main nav for admin/super_admin, but keep Attendance/Leave as top-level for employee/reporting_manager
    if (['admin', 'super_admin'].includes(user.role)) {
      return result.filter(item => !['attendance', 'leave', 'manage-attendance', 'leave-management', 'employees', 'teams', 'leave-type-management'].includes(item.id));
    } else {
      // For employee/reporting_manager, only remove admin-only tools
      return result.filter(item => !['employees', 'leave-type-management'].includes(item.id));
    }
  };

  const navItems = getFilteredNavigationItems();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'reporting_manager': return 'Manager';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      case 'reporting_manager': return 'outline';
      case 'employee': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return Crown;
      case 'admin': return Shield;
      case 'reporting_manager': return UserCog;
      case 'employee': return User;
      default: return User;
    }
  };

  const handleLogout = async () => {
    await logout();
    // Wait for user to become null (max 1s)
    for (let i = 0; i < 10; i++) {
      if (!user) break;
      await new Promise(res => setTimeout(res, 100));
    }
    // Explicitly clear Supabase auth keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden header-theme shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="order-first mr-2"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <CompanyLogo size="md" />
            <div className="flex flex-col">
            <span className="font-bold">{APP_NAME}</span>
              {user?.platform_super_admin && companies.length > 1 ? (
                <Select
                  value={currentCompany?.id || ''}
                  onValueChange={id => {
                    const selected = companies.find(c => c.id === id);
                    if (selected) setCurrentCompany(selected);
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                currentCompany && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {currentCompany.name}
                </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        {sidebarVisible && (
        <div
            className={`fixed inset-y-0 z-50 transition-all duration-300 ease-in-out transform lg:translate-x-0 lg:static lg:inset-0 ${themeClass} sidebar flex flex-col shadow-lg left-0`}
          style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', height: '100vh', width: '16rem', minWidth: '16rem', maxWidth: '16rem', position: 'fixed', top: 0, left: 0 }}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex flex-col items-center p-4 border-b border-border header-theme bg-white">
              {/* Product Branding */}
              <div className="flex items-center space-x-2 mb-2">
                <img src="/attendedge-logo.png" alt="Product Logo" className="w-8 h-8 object-contain" />
                <span className="font-['Cambria'] text-[27px] font-bold tracking-wide">
                  <span className="text-blue-600">Attend</span>
                  <span className="text-green-400">Edge</span>
                </span>
              </div>
              <div className="w-full border-t border-border my-2" />
              {/* Company Branding */}
              {currentCompany && (
                <div className="flex items-center space-x-2 w-full">
                  {currentCompany.logo_url ? (
                    <img src={currentCompany.logo_url} alt={currentCompany.name + ' Logo'} className="w-7 h-7 rounded object-contain bg-white border" />
                  ) : (
                    <CompanyLogo size="sm" />
                  )}
                  <button
                    className="text-sm font-medium truncate text-left hover:underline focus:outline-none"
                    onClick={() => onTabChange('company-profile')}
                    title="View Company Profile"
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
                  >
                    {currentCompany.name}
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1">
              {/* Render Dashboard first */}
              {navItems.filter(item => item.id === 'dashboard').map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${isActive 
                      ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold'
                      : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                    style={{ color: 'var(--card-text)' }}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="sidebar-label text-sm">{item.label}</span>
                    {item.requiresPermission && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                );
              })}

              {/* Human Resource retractable menu - Hidden for employees and consultants */}
              {!['employee', 'consultant'].includes(user?.role || '') && (
              <div>
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left font-semibold transition-colors sidebar-nav-btn bg-[rgba(0,0,0,0.03)] hover:bg-[rgba(0,0,0,0.06)]"
                  onClick={() => toggleSection('hr')}
                  aria-expanded={isSectionOpen('hr')}
                  aria-controls="hr-menu"
                >
                  <Users className="w-5 h-5" />
                  <span>Human Resource</span>
                  {isSectionOpen('hr') ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
                <div
                  id="hr-menu"
                  className={`pl-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isSectionOpen('hr') ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'
                  }`}
                  style={{ willChange: 'max-height, opacity, transform' }}
                >
                  <button
                    onClick={() => onTabChange('attendance')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'attendance' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Attendance</span>
                  </button>
                  <button
                    onClick={() => onTabChange('leave')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'leave' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Leave Requests</span>
                  </button>
                  <button
                    onClick={() => onTabChange('manage-attendance')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'manage-attendance' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Manage Attendance</span>
                  </button>
                  <button
                    onClick={() => onTabChange('leave-management')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'leave-management' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <ClipboardList className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Manage Leave Requests</span>
                  </button>
                  <button
                    onClick={() => onTabChange('holidays')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'holidays' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <CalendarDays className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Holidays</span>
                  </button>
                  <button
                    onClick={() => onTabChange('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'profile' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Profile</span>
                  </button>
                </div>
              </div>
              )}

              {/* Project Management retractable menu */}
              <div>
                <button
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left font-semibold transition-colors sidebar-nav-btn bg-[rgba(0,0,0,0.03)] hover:bg-[rgba(0,0,0,0.06)] mt-2"
                  onClick={() => toggleSection('project-management')}
                  aria-expanded={isSectionOpen('project-management')}
                  aria-controls="project-management-menu"
                >
                  <Briefcase className="w-5 h-5" />
                  <span>Project Management</span>
                  {isSectionOpen('project-management') ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
                <div
                  id="project-management-menu"
                  className={`pl-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isSectionOpen('project-management') ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'
                  }`}
                  style={{ willChange: 'max-height, opacity, transform' }}
                >
                  <button
                    onClick={() => onTabChange('my-projects')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'my-projects' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span className="sidebar-label text-sm">My Projects</span>
                  </button>
                  {['admin', 'super_admin'].includes(user?.role) && (
                    <button
                      onClick={() => onTabChange('manage-projects')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                        activeTab === 'manage-projects' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Manage Projects</span>
                    </button>
                  )}
                  <button
                    onClick={() => onTabChange('project-leave')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'project-leave' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <CalendarPlus className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Project Leave</span>
                  </button>
                  {['reporting_manager', 'admin', 'super_admin'].includes(user?.role) && (
                    <button
                      onClick={() => onTabChange('manage-project-leave')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                        activeTab === 'manage-project-leave' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                      }`}
                    >
                      <ClipboardList className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Manage Project Leave</span>
                    </button>
                  )}
                  <button
                    onClick={() => onTabChange('project-holidays')}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                      activeTab === 'project-holidays' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                    }`}
                  >
                    <CalendarDays className="w-5 h-5" />
                    <span className="sidebar-label text-sm">Project Holidays</span>
                  </button>
                  {['reporting_manager', 'admin', 'super_admin'].includes(user?.role) && (
                    <>
                      <button
                        onClick={() => onTabChange('project-reports')}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                          activeTab === 'project-reports' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                        }`}
                      >
                        <BarChart3 className="w-5 h-5" />
                        <span className="sidebar-label text-sm">Project Leave Reports</span>
                      </button>
                      <button
                        onClick={() => onTabChange('project-team-management')}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${
                          activeTab === 'project-team-management' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                        <span className="sidebar-label text-sm">Team Management</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Management retractable menu */}
              {['admin', 'super_admin', 'reporting_manager'].includes(user?.role) && (
                <>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left font-semibold transition-colors sidebar-nav-btn bg-[rgba(0,0,0,0.03)] hover:bg-[rgba(0,0,0,0.06)] mt-2"
                    onClick={() => toggleSection('management')}
                    aria-expanded={isSectionOpen('management')}
                    aria-controls="management-menu"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Management</span>
                    {isSectionOpen('management') ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                  <div
                    id="management-menu"
                    className={`pl-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isSectionOpen('management') ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}
                    style={{ willChange: 'max-height, opacity, transform' }}
                  >
                    <button
                      onClick={() => onTabChange('employees')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'employees' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <Users className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Employee Management</span>
                    </button>
                    <button
                      onClick={() => onTabChange('teams')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'teams' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <Network className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Team Management</span>
                    </button>
                    <button
                      onClick={() => onTabChange('leave-type-management')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'leave-type-management' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <Calendar className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Leave Type Management</span>
                    </button>
                    <button
                      onClick={() => onTabChange('profile-management')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'profile-management' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <UserCircle className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Profile Management</span>
                    </button>
                    <button
                      onClick={() => onTabChange('settings')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'settings' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="sidebar-label text-sm">System Settings</span>
                    </button>
                    <button
                      onClick={() => onTabChange('session-settings')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'session-settings' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <Shield className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Session Settings</span>
                    </button>
                  </div>
                </>
              )}

              {/* Reports retractable menu */}
              {['admin', 'super_admin', 'reporting_manager'].includes(user?.role) && (
                <>
                  <button
                    className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left font-semibold transition-colors sidebar-nav-btn bg-[rgba(0,0,0,0.03)] hover:bg-[rgba(0,0,0,0.06)] mt-2"
                    onClick={() => {
                      toggleSection('reports');
                    }}
                    aria-expanded={isSectionOpen('reports')}
                    aria-controls="reports-menu"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Reports</span>
                    {isSectionOpen('reports') ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                  <div
                    id="reports-menu"
                    className={`pl-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isSectionOpen('reports') ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}
                    style={{ willChange: 'max-height, opacity, transform' }}
                  >
                    <button
                      onClick={() => onTabChange('reports')}
                      className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'reports' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                    >
                      <BarChart3 className="w-5 h-5" />
                      <span className="sidebar-label text-sm">Reports & Analytics</span>
                    </button>
                    {currentCompany?.moduleSettings?.performance_report_enabled && (
                      <button
                        onClick={() => onTabChange('performance-report')}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'performance-report' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                      >
                        <TrendingUp className="w-5 h-5" />
                        <span className="sidebar-label text-sm">Performance Report</span>
                      </button>
                    )}
                    {currentCompany?.moduleSettings?.performance_report_enabled && (
                      <button
                        onClick={() => onTabChange('recruitment-report')}
                        className={`w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn ${activeTab === 'recruitment-report' ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold' : 'hover:bg-[rgba(0,0,0,0.02)]'}`}
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                        <span className="sidebar-label text-sm">Recruitment Report</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Render the rest of the navigation items */}
              {navItems.filter(item => ![
                'dashboard', 
                'reports', 
                'performance-report', 
                'recruitment-report',
                'profile-management',  // In Management section
                'settings',           // In Management section
                'session-settings',   // In Management section
                'my-projects',        // In Project Management section
                'manage-projects',    // In Project Management section
                'project-leave',      // In Project Management section
                'manage-project-leave', // In Project Management section
                'project-holidays',   // In Project Management section
                'project-reports',    // In Project Management section
                'project-team-management' // In Project Management section
              ].includes(item.id)).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-2 rounded-md text-left transition-colors sidebar-nav-btn
                      ${isActive 
                        ? 'border-l-4 border-primary bg-[rgba(0,0,0,0.04)] font-semibold'
                        : 'hover:bg-[rgba(0,0,0,0.02)]'
                      }
                    `}
                    style={{ color: 'var(--card-text)' }}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="sidebar-label text-sm">
                      {item.label}
                    </span>
                    {item.requiresPermission && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile Section */}
            <div className="p-3 border-t border-border header-theme">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                    </div>
                      <div className="text-left">
                        <div className="font-medium text-xs">{user?.name || 'User'}</div>
                        <div className="text-xs text-muted-foreground">{user?.email}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <div className="font-medium">{user?.name || 'User'}</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getRoleBadgeVariant(user?.role || 'employee')}>
                        {user?.position || getRoleDisplayName(user?.role || 'employee')}
                      </Badge>
                    </div>
                    {currentCompany && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Building className="w-3 h-3" />
                        {currentCompany.name}
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className="flex-1" style={{ marginLeft: sidebarVisible ? '16rem' : 0, height: '100vh', overflowY: 'auto', transition: 'margin-left 0.3s' }}>
          <div className="p-3 lg:p-4">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
