import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define the types for our new data structures
export interface EmployeeProfile {
  id: string;
  employee_id: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  personal_email?: string;
  phone_number?: string;
  blood_group?: string;
  marriage_anniversary?: string;
  alternate_phone_number?: string;
  current_address?: string;
  permanent_address?: string;
  house_type?: string;
  residing_since?: string;
  living_in_city_since?: string;
  social_profiles?: any;
  employee_code?: string;
  date_of_joining?: string;
  probation_period?: number | null;
  employee_type?: string;
  work_location?: string;
  probation_status?: string;
  work_experience_years?: number | null;
  designation?: string;
  job_title?: string;
  department?: string;
  sub_department?: string;
  work_history?: any;
  education_history?: any;
  family_members?: any;
  emergency_contacts?: any;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface FullUserProfile {
  employee: any;
  profile: EmployeeProfile | null;
  documents: EmployeeDocument[];
}

export const useUserProfile = (employeeId: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null);

  const fetchUserProfile = async () => {
    if (!employeeId) return;
    setLoading(true);
    // Fetch employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle();
    // Fetch profile
    const { data: profile, error: profError } = await supabase
      .from('employee_profiles')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    // Fetch documents
    const { data: documents, error: docError } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });
    setProfileData({
      employee,
      profile,
      documents: documents || [],
    });
    setLoading(false);
  };

  const updateUserProfile = async (profileUpdate: Partial<EmployeeProfile>) => {
    setLoading(true);
    // Convert string fields to numbers if present
    const update: any = { ...profileUpdate };
    if (typeof update.probation_period === 'string') {
      update.probation_period = update.probation_period ? parseInt(update.probation_period, 10) : null;
    }
    if (typeof update.work_experience_years === 'string') {
      update.work_experience_years = update.work_experience_years ? parseInt(update.work_experience_years, 10) : null;
    }
    // Convert empty string date fields to null
    const dateFields = [
      'date_of_birth',
      'marriage_anniversary',
      'residing_since',
      'living_in_city_since',
      'date_of_joining'
    ];
    dateFields.forEach(field => {
      if (update[field] === '') {
        update[field] = null;
      }
    });
    // Parse JSON string fields to arrays if needed
    ['work_history', 'education_history', 'family_members', 'emergency_contacts'].forEach(field => {
      if (typeof update[field] === 'string') {
        try {
          update[field] = update[field] ? JSON.parse(update[field]) : [];
        } catch {
          update[field] = [];
        }
      }
    });
    // Check if profile exists
    const { data: existing, error: fetchError } = await supabase
      .from('employee_profiles')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase
        .from('employee_profiles')
        .update(update)
        .eq('employee_id', employeeId));
    } else {
      ({ error } = await supabase
        .from('employee_profiles')
        .insert({ employee_id: employeeId, ...update }));
    }
    if (error) {
      console.error('Error updating profile:', error);
    } else {
      await fetchUserProfile();
    }
    setLoading(false);
  };

  const uploadDocument = async (file: File, documentType: string) => {
    if (!user) return;
    setLoading(true);
    const filePath = `${employeeId}/${Date.now()}_${file.name}`;
    // Debug logs for RLS troubleshooting
    console.log('Auth user id:', user.id);
    console.log('employeeId used for document:', employeeId);
    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, file);
    if (uploadError) {
      alert('Error uploading file: ' + uploadError.message);
      setLoading(false);
      return;
    }
    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);
    // 3. Save metadata to database
    const { error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: employeeId,
        document_type: documentType,
        file_url: urlData.publicUrl,
        uploaded_by: user.id
      });
    if (dbError) {
      alert('Error saving document metadata: ' + dbError.message);
    } else {
      await fetchUserProfile();
    }
    setLoading(false);
  };

  return {
    loading,
    profileData,
    fetchUserProfile,
    updateUserProfile,
    uploadDocument,
  };
}; 