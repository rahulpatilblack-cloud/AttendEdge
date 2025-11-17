import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useProjects } from '@/contexts/ProjectContext';

interface CurrentProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

const CurrentProjectContext = createContext<CurrentProjectContextType | undefined>(undefined);

export const CurrentProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { projects } = useProjects();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Initialize from localStorage or first available project
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('currentProjectId') : null;
    if (saved) {
      setCurrentProjectId(saved);
    } else if (!currentProjectId && projects && projects.length > 0) {
      setCurrentProjectId(projects[0].id as unknown as string);
    }
  }, [projects]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentProjectId) {
        window.localStorage.setItem('currentProjectId', currentProjectId);
      } else {
        window.localStorage.removeItem('currentProjectId');
      }
    }
  }, [currentProjectId]);

  const value = useMemo(() => ({ currentProjectId, setCurrentProjectId }), [currentProjectId]);

  return (
    <CurrentProjectContext.Provider value={value}>
      {children}
    </CurrentProjectContext.Provider>
  );
};

export const useCurrentProject = (): CurrentProjectContextType => {
  const ctx = useContext(CurrentProjectContext);
  if (!ctx) {
    throw new Error('useCurrentProject must be used within CurrentProjectProvider');
  }
  return ctx;
};
