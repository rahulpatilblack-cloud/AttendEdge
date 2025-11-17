import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  position: string | null;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_id?: string;
  team_id?: string;
  reporting_manager_id?: string;
}

export const useEmployees = () => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeEmployee = async (employeeId: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) {
        console.error('Error removing employee:', error);
        return false;
      }

      await fetchEmployees(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error removing employee:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      user &&
      (user.role === 'admin' ||
       user.role === 'super_admin' ||
       user.role === 'reporting_manager')
    ) {
      fetchEmployees();
    }
  }, [user, currentCompany]);

  return {
    employees,
    isLoading,
    fetchEmployees,
    removeEmployee
  };
};
