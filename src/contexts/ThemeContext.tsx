import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define available themes and their color variables
export const THEME_OPTIONS = [
  {
    key: 'light',
    name: 'Light',
    className: '',
  },
  {
    key: 'vibrant-blue',
    name: 'Vibrant Blue',
    className: 'theme-vibrant-blue',
  },
  {
    key: 'vibrant-green',
    name: 'Vibrant Green',
    className: 'theme-vibrant-green',
  },
  {
    key: 'vibrant-purple',
    name: 'Vibrant Purple',
    className: 'theme-vibrant-purple',
  },
  {
    key: 'vibrant-orange',
    name: 'Vibrant Orange',
    className: 'theme-vibrant-orange',
  },
  {
    key: 'vibrant-pink',
    name: 'Vibrant Pink',
    className: 'theme-vibrant-pink',
  },
  {
    key: 'vibrant-teal',
    name: 'Vibrant Teal',
    className: 'theme-vibrant-teal',
  },
  {
    key: 'vibrant-yellow',
    name: 'Vibrant Yellow',
    className: 'theme-vibrant-yellow',
  },
];

export const FONT_FAMILIES = [
  { key: "'Inter', sans-serif", name: 'Inter (Modern)' },
  { key: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", name: 'Segoe UI (Windows)' },
  { key: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", name: 'SF Pro (macOS)' },
  { key: "'Roboto', 'Helvetica Neue', Arial, sans-serif", name: 'Roboto (Google)' },
  { key: "'Open Sans', 'Helvetica Neue', Arial, sans-serif", name: 'Open Sans' },
  { key: "'Montserrat', 'Helvetica Neue', Arial, sans-serif", name: 'Montserrat' },
  { key: "'Arial', Helvetica, sans-serif", name: 'Arial (Classic)' },
  { key: "'Helvetica Neue', Helvetica, Arial, sans-serif", name: 'Helvetica Neue' },
  { key: "'Verdana', Geneva, sans-serif", name: 'Verdana' },
  { key: "'Tahoma', Geneva, Verdana, sans-serif", name: 'Tahoma' },
  { key: "'Georgia', 'Times New Roman', serif", name: 'Georgia (Serif)' },
  { key: "'Times New Roman', Times, serif", name: 'Times New Roman' },
  { key: "'Courier New', Courier, monospace", name: 'Courier New (Monospace)' },
  { key: "'Consolas', 'Monaco', 'Courier New', monospace", name: 'Consolas (Code)' },
];

export const FONT_SIZES = [
  { key: '14px', name: 'Small' },
  { key: '16px', name: 'Default' },
  { key: '18px', name: 'Large' },
  { key: '20px', name: 'Extra Large' },
];

export const LAYOUT_DENSITIES = [
  { key: 'compact', name: 'Compact' },
  { key: 'cozy', name: 'Cozy' },
  { key: 'spacious', name: 'Spacious' },
];

export const BORDER_RADIUS_OPTIONS = [
  { key: '0px', name: 'Sharp' },
  { key: '0.375rem', name: 'Slightly Rounded' },
  { key: '0.75rem', name: 'Rounded' },
  { key: '1rem', name: 'Very Rounded' },
];

export const SIDEBAR_POSITIONS = [
  { key: 'left', name: 'Left' },
  { key: 'right', name: 'Right' },
];

export const ACCENT_COLORS = [
  { key: '214 100% 59%', name: 'Blue (Default)', hex: '#3b82f6' },
  { key: '142 71% 45%', name: 'Green', hex: '#10b981' },
  { key: '271 91% 65%', name: 'Purple', hex: '#8b5cf6' },
  { key: '24 100% 50%', name: 'Orange', hex: '#f97316' },
  { key: '0 84% 60%', name: 'Red', hex: '#ef4444' },
  { key: '45 93% 47%', name: 'Yellow', hex: '#eab308' },
  { key: '156 100% 50%', name: 'Teal', hex: '#14b8a6' },
  { key: '262 83% 58%', name: 'Indigo', hex: '#6366f1' },
];

export const NOTIFICATION_TYPES = [
  { key: 'toast', name: 'Toast Notifications', description: 'Show pop-up notifications' },
  { key: 'sound', name: 'Sound Alerts', description: 'Play notification sounds' },
  { key: 'email', name: 'Email Notifications', description: 'Send email alerts' },
];

export const SUPPORTED_LANGUAGES = [
  { key: 'en', name: 'English', flag: '🇺🇸' },
  { key: 'es', name: 'Español', flag: '🇪🇸' },
  { key: 'fr', name: 'Français', flag: '🇫🇷' },
  { key: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { key: 'it', name: 'Italiano', flag: '🇮🇹' },
  { key: 'pt', name: 'Português', flag: '🇵🇹' },
  { key: 'ru', name: 'Русский', flag: '🇷🇺' },
  { key: 'zh', name: '中文', flag: '🇨🇳' },
  { key: 'ja', name: '日本語', flag: '🇯🇵' },
  { key: 'ko', name: '한국어', flag: '🇰🇷' },
  { key: 'ar', name: 'العربية', flag: '🇸🇦' },
  { key: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  sidebarPosition: string;
  setSidebarPosition: (position: string) => void;
  borderRadius: string;
  setBorderRadius: (radius: string) => void;
  layoutDensity: string;
  setLayoutDensity: (density: string) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  customAccent: string;
  setCustomAccent: (color: string) => void;
  notifications: {
    toast: boolean;
    sound: boolean;
    email: boolean;
  };
  setNotificationPreference: (type: string, enabled: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  fontFamily: "'Inter', sans-serif",
  setFontFamily: () => {},
  fontSize: '16px',
  setFontSize: () => {},
  sidebarPosition: 'left',
  setSidebarPosition: () => {},
  borderRadius: '0.75rem',
  setBorderRadius: () => {},
  layoutDensity: 'cozy',
  setLayoutDensity: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
  customAccent: '214 100% 59%',
  setCustomAccent: () => {},
  notifications: {
    toast: true,
    sound: false,
    email: true,
  },
  setNotificationPreference: () => {},
  language: 'en',
  setLanguage: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState('light');
  const [fontFamily, setFontFamilyState] = useState("'Inter', sans-serif");
  const [fontSize, setFontSizeState] = useState('16px');
  const [sidebarPosition, setSidebarPositionState] = useState('left');
  const [borderRadius, setBorderRadiusState] = useState('0.75rem');
  const [layoutDensity, setLayoutDensityState] = useState('cozy');
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [customAccent, setCustomAccentState] = useState('214 100% 59%');
  const [notifications, setNotificationsState] = useState({
    toast: true,
    sound: false,
    email: true,
  });
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    // Load all settings from localStorage
    const savedTheme = localStorage.getItem('theme');
    const savedFont = localStorage.getItem('fontFamily');
    const savedSize = localStorage.getItem('fontSize');
    const savedSidebar = localStorage.getItem('sidebarPosition');
    const savedRadius = localStorage.getItem('borderRadius');
    const savedDensity = localStorage.getItem('layoutDensity');
    const savedMotion = localStorage.getItem('reducedMotion');
    const savedAccent = localStorage.getItem('customAccent');
    
    if (savedTheme && THEME_OPTIONS.some(t => t.key === savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      setThemeState('light');
      applyTheme('light');
    }
    
    if (savedFont && FONT_FAMILIES.some(f => f.key === savedFont)) {
      setFontFamilyState(savedFont);
      document.documentElement.style.setProperty('--font-family', savedFont);
    } else {
      setFontFamilyState("'Inter', sans-serif");
      document.documentElement.style.setProperty('--font-family', "'Inter', sans-serif");
    }
    
    if (savedSize && FONT_SIZES.some(f => f.key === savedSize)) {
      setFontSizeState(savedSize);
      document.documentElement.style.setProperty('--font-size', savedSize);
    } else {
      setFontSizeState('16px');
      document.documentElement.style.setProperty('--font-size', '16px');
    }
    
    if (savedSidebar && SIDEBAR_POSITIONS.some(s => s.key === savedSidebar)) {
      setSidebarPositionState(savedSidebar);
      document.documentElement.style.setProperty('--sidebar-position', savedSidebar);
    } else {
      setSidebarPositionState('left');
      document.documentElement.style.setProperty('--sidebar-position', 'left');
    }
    
    if (savedRadius && BORDER_RADIUS_OPTIONS.some(r => r.key === savedRadius)) {
      setBorderRadiusState(savedRadius);
      document.documentElement.style.setProperty('--border-radius', savedRadius);
    } else {
      setBorderRadiusState('0.75rem');
      document.documentElement.style.setProperty('--border-radius', '0.75rem');
    }
    
    if (savedDensity && LAYOUT_DENSITIES.some(d => d.key === savedDensity)) {
      setLayoutDensityState(savedDensity);
      document.documentElement.style.setProperty('--layout-density', savedDensity);
      applyLayoutDensity(savedDensity);
    } else {
      setLayoutDensityState('cozy');
      document.documentElement.style.setProperty('--layout-density', 'cozy');
      applyLayoutDensity('cozy');
    }
    
    if (savedMotion !== null) {
      const motionEnabled = savedMotion === 'true';
      setReducedMotionState(motionEnabled);
      applyReducedMotion(motionEnabled);
    } else {
      setReducedMotionState(false);
      applyReducedMotion(false);
    }
    
    if (savedAccent && ACCENT_COLORS.some(c => c.key === savedAccent)) {
      setCustomAccentState(savedAccent);
      document.documentElement.style.setProperty('--custom-accent', savedAccent);
      document.documentElement.style.setProperty('--primary', `hsl(${savedAccent})`);
    } else {
      setCustomAccentState('214 100% 59%');
      document.documentElement.style.setProperty('--custom-accent', '214 100% 59%');
      document.documentElement.style.setProperty('--primary', 'hsl(214 100% 59%)');
    }
  }, []);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const setFontFamily = (font: string) => {
    setFontFamilyState(font);
    localStorage.setItem('fontFamily', font);
    document.documentElement.style.setProperty('--font-family', font);
  };

  const setFontSize = (size: string) => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.style.setProperty('--font-size', size);
  };

  const setSidebarPosition = (position: string) => {
    setSidebarPositionState(position);
    localStorage.setItem('sidebarPosition', position);
    document.documentElement.style.setProperty('--sidebar-position', position);
  };

  const setBorderRadius = (radius: string) => {
    setBorderRadiusState(radius);
    localStorage.setItem('borderRadius', radius);
    document.documentElement.style.setProperty('--border-radius', radius);
  };

  const setLayoutDensity = (density: string) => {
    setLayoutDensityState(density);
    localStorage.setItem('layoutDensity', density);
    document.documentElement.style.setProperty('--layout-density', density);
    applyLayoutDensity(density);
  };

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem('reducedMotion', enabled.toString());
    applyReducedMotion(enabled);
  };

  const setCustomAccent = (color: string) => {
    setCustomAccentState(color);
    localStorage.setItem('customAccent', color);
    document.documentElement.style.setProperty('--custom-accent', color);
    document.documentElement.style.setProperty('--primary', `hsl(${color})`);
  };

  const setNotificationPreference = (type: string, enabled: boolean) => {
    const newNotifications = { ...notifications, [type]: enabled };
    setNotificationsState(newNotifications);
    localStorage.setItem('notifications', JSON.stringify(newNotifications));
    document.documentElement.style.setProperty(`--notifications-${type}`, enabled.toString());
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.style.setProperty('--language', lang);
  };

  const applyTheme = (themeKey: string) => {
    document.documentElement.classList.remove(
      'dark',
      'theme-vibrant-blue',
      'theme-vibrant-green',
      'theme-vibrant-purple',
      'theme-vibrant-orange'
    );
    const themeObj = THEME_OPTIONS.find(t => t.key === themeKey);
    if (themeObj && themeObj.className) {
      document.documentElement.classList.add(themeObj.className);
    }
  };

  const applyLayoutDensity = (density: string) => {
    document.documentElement.classList.remove('density-compact', 'density-cozy', 'density-spacious');
    document.documentElement.classList.add(`density-${density}`);
  };

  const applyReducedMotion = (enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
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
    }}>
      {children}
    </ThemeContext.Provider>
  );
}; 