import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Clock, 
  Calendar, 
  Users, 
  User, 
  Settings, 
  BarChart3,
  Building2,
  X,
  Command
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'action' | 'data';
  path?: string;
  icon: React.ComponentType<any>;
  category: string;
}

interface GlobalSearchProps {
  onNavigate: (path: string) => void;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  onNavigate, 
  className = "" 
}) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Define searchable items
  const searchableItems: SearchResult[] = [
    // Pages
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Main dashboard with overview and quick actions',
      type: 'page',
      path: 'dashboard',
      icon: Building2,
      category: 'Navigation'
    },
    {
      id: 'attendance',
      title: 'Attendance',
      description: 'View and manage your attendance records',
      type: 'page',
      path: 'attendance',
      icon: Clock,
      category: 'Employee'
    },
    {
      id: 'leave',
      title: 'Leave Requests',
      description: 'Request and view leave applications',
      type: 'page',
      path: 'leave',
      icon: Calendar,
      category: 'Employee'
    },
    {
      id: 'teams',
      title: 'Team Management',
      description: 'Manage team members and assignments',
      type: 'page',
      path: 'teams',
      icon: Users,
      category: 'Management'
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      description: 'View detailed reports and analytics',
      type: 'page',
      path: 'reports',
      icon: BarChart3,
      category: 'Management'
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'View and edit your profile information',
      type: 'page',
      path: 'profile',
      icon: User,
      category: 'Account'
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Application settings and preferences',
      type: 'page',
      path: 'settings',
      icon: Settings,
      category: 'Account'
    },
    {
      id: 'session-settings',
      title: 'Session Settings',
      description: 'Manage session timeout and security settings',
      type: 'page',
      path: 'session-settings',
      icon: Settings,
      category: 'Account'
    },
    // Actions
    {
      id: 'check-in',
      title: 'Check In',
      description: 'Mark your attendance for today',
      type: 'action',
      path: 'attendance',
      icon: Clock,
      category: 'Quick Actions'
    },
    {
      id: 'request-leave',
      title: 'Request Leave',
      description: 'Submit a new leave request',
      type: 'action',
      path: 'leave',
      icon: Calendar,
      category: 'Quick Actions'
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Access detailed reports and analytics',
      type: 'action',
      path: 'reports',
      icon: BarChart3,
      category: 'Quick Actions'
    }
  ];

  // Filter results based on query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = searchableItems.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    if (result.path) {
      onNavigate(result.path);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={resultsRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search employees, reports, settings..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-10 w-full md:w-80"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <Badge variant="outline" className="text-xs">
            <Command className="w-3 h-3 mr-1" />
            K
          </Badge>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-0">
          <CardContent className="p-0">
            {results.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {results.map((result, index) => {
                  const Icon = result.icon;
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <div
                      key={result.id}
                      className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          result.type === 'page' ? 'bg-blue-100' :
                          result.type === 'action' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            result.type === 'page' ? 'text-blue-600' :
                            result.type === 'action' ? 'text-green-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{result.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {result.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query ? (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Start typing to search...</p>
                <p className="text-sm mt-1">Search for pages, actions, and more</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
