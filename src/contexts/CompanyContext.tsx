import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface CompanyModuleSettings {
  performance_report_enabled: boolean;
  // Add more feature flags as needed
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  headquarters?: string | null;
  type?: string | null;
  founded?: string | null;
  locations?: string | null;
  logo_url?: string | null;
  linkedin_url?: string | null;
  moduleSettings?: CompanyModuleSettings;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  setCurrentCompany: (company: Company | null) => void;
  refreshCompanies: () => Promise<void>;
  createCompany: (name: string, domain: string) => Promise<Company | null>;
  enrollUserInCompany: (userId: string, companyId: string) => Promise<boolean>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyModuleSettings, setCompanyModuleSettings] = useState<CompanyModuleSettings | null>(null);

  const setCurrentCompany = (company: Company | null) => {
    setCurrentCompanyState(company);
    if (company) {
      localStorage.setItem('selectedCompany', JSON.stringify(company));
    } else {
      localStorage.removeItem('selectedCompany');
    }
    console.log('[CompanyContext] Set current company:', company);
  };

  const fetchCompanies = async (): Promise<Company[]> => {
    if (!user) {
      setCompanies([]);
      return [];
    }
    try {
      // If platform_super_admin, fetch all companies
      if (user.platform_super_admin) {
        const { data: allCompanies, error: allCompaniesError } = await supabase
          .from('companies')
          .select('*');
        if (allCompaniesError || !allCompanies) {
          console.error('[CompanyContext] Error fetching all companies:', allCompaniesError);
          setCompanies([]);
          return [];
        }
        setCompanies(allCompanies);
        return allCompanies;
      }
      // Get the user's company ID from the profile
      const { data: userProfile } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', user.id)
        .single();

      // Type assertion to allow access to company_id
      const companyId = (userProfile as { company_id?: string })?.company_id;

      if (!companyId) {
        console.error('[CompanyContext] Error fetching company_id from profile: No company_id found');
        return [];
      }

      // Now fetch the company details using the company_id string
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        console.error('[CompanyContext] Error fetching company:', companyError);
        return [];
      }

      setCompanies([company]);
      return [company];
    } catch (error) {
      console.error('[CompanyContext] Error in fetchCompanies:', error);
      return [];
    }
  };

  const fetchCompanyModuleSettings = async (companyId: string) => {
    const { data, error } = await supabase
      .from('company_module_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();
    if (!error && data) {
      setCompanyModuleSettings(data);
      return data;
    } else {
      setCompanyModuleSettings(null);
      return null;
    }
  };

  const refreshCompanies = async () => {
    await fetchCompanies();
  };

  const createCompany = async (name: string, domain: string): Promise<Company | null> => {
    try {
      // Step 1: Log current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[CompanyContext] Current user before createCompany:', user);
      console.log('[CompanyContext] Auth error:', authError);

      // Step 2: Attempt insert and log error
      console.log('Inserting company:', { name, domain });
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, domain }])
        .select('*')
        .single();

      if (error) {
        console.error('[CompanyContext] Supabase error creating company:', error);
        return null;
      }

      if (!data) {
        console.error('[CompanyContext] No data returned after inserting company.');
        return null;
      }

      return data as Company;
    } catch (err) {
      console.error('[CompanyContext] Exception creating company:', err);
      return null;
    }
  };

  const enrollUserInCompany = async (userId: string, companyId: string): Promise<boolean> => {
    try {
      // Update the employee's company_id
      const { error } = await supabase
        .from('employees')
        .update({ company_id: companyId })
        .eq('id', userId);
      if (error) {
        console.error('[CompanyContext] Error enrolling user in company:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[CompanyContext] Exception enrolling user in company:', err);
      return false;
    }
  };

  useEffect(() => {
    const initializeCompany = async () => {
      if (!user) {
        setCompanies([]);
        setCurrentCompany(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const allCompanies = await fetchCompanies();

      const determineCompany = async (): Promise<Company | null> => {
        // Priority 1: Check localStorage
        const storedCompanyRaw = localStorage.getItem('selectedCompany');
        if (storedCompanyRaw) {
          try {
            const storedCompany = JSON.parse(storedCompanyRaw);
            if (allCompanies.some(c => c.id === storedCompany.id)) {
              console.log('[CompanyContext] Using company from localStorage:', storedCompany);
              return storedCompany;
            }
          } catch (e) {
            console.error('Failed to parse stored company', e);
            localStorage.removeItem('selectedCompany');
          }
        }

        // Priority 2: Check user's company using helper function
        try {
          // Get the company ID using the SQL function
          const { data: userProfile } = await supabase
            .from('employees')
            .select('company_id')
            .eq('id', user.id)
            .single();

          const companyId = (userProfile as { company_id?: string })?.company_id;

          if (!companyId) {
            console.error('[CompanyContext] Error getting company ID: No company_id found');
            return null;
          }

          // Now fetch the company details
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

          if (companyError || !company) {
            console.error('[CompanyContext] Error getting company details:', companyError);
            return null;
          }

          if (company && company.id) {
            const moduleSettings = await fetchCompanyModuleSettings(company.id);
            company.moduleSettings = moduleSettings;
          }

          console.log('[CompanyContext] Using company from user profile:', company);
          return company;
        } catch (error) {
          console.error('[CompanyContext] Error fetching user company:', error);
          return null;
        }

        // Priority 3: Fallback to the first company
        if (allCompanies.length > 0) {
          console.log('[CompanyContext] Using fallback company:', allCompanies[0]);
          return allCompanies[0];
        }

        return null;
      };

      const companyToSet = await determineCompany();
      setCurrentCompany(companyToSet);

      setLoading(false);
    };

    initializeCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value: CompanyContextType = {
    currentCompany,
    companies,
    loading,
    setCurrentCompany,
    refreshCompanies,
    createCompany,
    enrollUserInCompany,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};