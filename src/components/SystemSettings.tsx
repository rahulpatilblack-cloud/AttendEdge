import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from './ui/label';
import { ShieldCheck, User, Settings as SettingsIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useTheme, THEME_OPTIONS, FONT_FAMILIES, FONT_SIZES, SIDEBAR_POSITIONS, BORDER_RADIUS_OPTIONS, LAYOUT_DENSITIES, ACCENT_COLORS, NOTIFICATION_TYPES, SUPPORTED_LANGUAGES } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const ROLE_COLORS = {
  admin: 'from-blue-500 to-purple-600',
  super_admin: 'from-purple-600 to-pink-500',
  employee: 'from-green-400 to-orange-400',
};
const ROLE_BADGES = {
  admin: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"><ShieldCheck className="w-4 h-4" /> Admin</span>,
  super_admin: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold"><SettingsIcon className="w-4 h-4" /> Super Admin</span>,
  employee: <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><User className="w-4 h-4" /> Employee</span>,
};

const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    theme, setTheme, 
    fontFamily, setFontFamily, 
    fontSize, setFontSize,
    sidebarPosition, setSidebarPosition,
    borderRadius, setBorderRadius,
    layoutDensity, setLayoutDensity,
    reducedMotion, setReducedMotion,
    customAccent, setCustomAccent,
    notifications, setNotificationPreference,
    language, setLanguage
  } = useTheme();
  const [lateMarkTime, setLateMarkTime] = useState('09:30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t, i18n } = useTranslation();
  const role = user?.role || 'employee';

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from<'system_settings', Database['public']['Tables']['system_settings']['Row']>('system_settings')
        .select('value')
        .eq('key', 'late_mark_time')
        .single();
      if (!error && data) setLateMarkTime(data.value);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from<'system_settings', Database['public']['Tables']['system_settings']['Row']>('system_settings')
      .upsert({ key: 'late_mark_time', value: lateMarkTime, description: 'Time after which check-in is considered late (HH:MM, 24h format)' });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Late mark time updated!' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-600">Customize your application experience</p>
          </div>
        </div>
        {ROLE_BADGES[role]}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appearance Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">🎨</span>
              </div>
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="theme-select" className="text-sm font-medium text-gray-700">Color Theme</Label>
              <select
                id="theme-select"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {THEME_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="font-family" className="text-sm font-medium text-gray-700">Font Family</Label>
              <select
                id="font-family"
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FONT_FAMILIES.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="font-size" className="text-sm font-medium text-gray-700">Font Size</Label>
              <select
                id="font-size"
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FONT_SIZES.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="accent-color" className="text-sm font-medium text-gray-700">Accent Color</Label>
              <div className="flex items-center space-x-2 mt-1">
                <select
                  id="accent-color"
                  value={customAccent}
                  onChange={e => setCustomAccent(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ACCENT_COLORS.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
                <div 
                  className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm"
                  style={{ backgroundColor: ACCENT_COLORS.find(c => c.key === customAccent)?.hex }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">⚙️</span>
              </div>
              <span>Layout</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sidebar-position" className="text-sm font-medium text-gray-700">Sidebar Position</Label>
              <select
                id="sidebar-position"
                value={sidebarPosition}
                onChange={e => setSidebarPosition(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SIDEBAR_POSITIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="border-radius" className="text-sm font-medium text-gray-700">Component Shape</Label>
              <select
                id="border-radius"
                value={borderRadius}
                onChange={e => setBorderRadius(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {BORDER_RADIUS_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="layout-density" className="text-sm font-medium text-gray-700">Layout Density</Label>
              <select
                id="layout-density"
                value={layoutDensity}
                onChange={e => setLayoutDensity(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LAYOUT_DENSITIES.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700">Reduced Motion</Label>
                <p className="text-xs text-gray-500 mt-1">Disable animations for accessibility</p>
              </div>
              <input
                type="checkbox"
                id="reduced-motion"
                checked={reducedMotion}
                onChange={e => setReducedMotion(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">🔔</span>
            </div>
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NOTIFICATION_TYPES.map(notification => (
              <div key={notification.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="font-medium text-sm text-gray-900">{notification.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.description}</p>
                </div>
                <input
                  type="checkbox"
                  id={`notification-${notification.key}`}
                  checked={notifications[notification.key as keyof typeof notifications]}
                  onChange={e => setNotificationPreference(notification.key, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language and System Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm">🌐</span>
              </div>
              <span>Language</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              id="language"
              value={language}
              onChange={e => {
                setLanguage(e.target.value);
                i18n.changeLanguage(e.target.value);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.key} value={lang.key}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-sm">⏰</span>
              </div>
              <span>System Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="lateMarkTime" className="text-sm font-medium text-gray-700">Late Mark Time</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="lateMarkTime"
                  type="time"
                  value={lateMarkTime}
                  onChange={e => setLateMarkTime(e.target.value)}
                  className={`w-32 ${role === 'employee' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  disabled={loading || role === 'employee'}
                />
                {role === 'employee' && (
                  <span className="text-xs text-gray-500">(Read-only)</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Check-ins after this time are considered late</p>
            </div>
            {role !== 'employee' && (
              <Button 
                onClick={handleSave} 
                disabled={loading || saving} 
                className="mt-3 w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings; 