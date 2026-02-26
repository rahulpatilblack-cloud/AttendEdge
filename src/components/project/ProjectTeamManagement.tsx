import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddEmployeeForm from '@/components/AddEmployeeForm';
import EmployeeList from '@/components/EmployeeList';
import { UserPlus, Loader2, Upload, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BulkImportModal from './BulkImportModal';
import BulkUpdateModal from './BulkUpdateModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const consultantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  role: z.enum(['employee', 'reporting_manager']).default('employee'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ConsultantFormValues = z.infer<typeof consultantSchema>;

const ProjectTeamManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const { signup } = useAuth();
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ConsultantFormValues>({
    resolver: zodResolver(consultantSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
      department: '',
      position: 'Consultant',
    },
  });

  const handleAddConsultant = () => {
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    form.reset();
  };

  const handleUpdateComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Update Complete',
      description: 'Bulk update completed successfully',
    });
  };

  const DEFAULT_COMPANY_ID = '91fc12c5-61ad-4776-8685-2ab18ee01274';

  const onSubmit = async (data: ConsultantFormValues) => {
    const companyId = currentCompany?.id || DEFAULT_COMPANY_ID;

    setIsLoading(true);
    try {
      // First, sign up user
      const { success, error, userId } = await signup(
        data.email,
        data.password,
        data.name,
        data.role
      );

      if (success && userId) {
        // Update user's profile with company and position
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            company_id: companyId,
            position: 'Consultant',
            department: data.department,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw new Error('Failed to update consultant profile');
        }

        toast({
          title: 'Success',
          description: 'Consultant added successfully',
        });
        setShowAddForm(false);
        form.reset();
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(error || 'Failed to add consultant');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add consultant',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Supabase authentication for bulk import with duplicate check
  const addConsultantDirectly = async (
    email: string,
    password: string,
    name: string,
    role: string,
    companyId: string,
    department: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔹 Starting consultant creation:', { email, name, role, department });

      // Step 0: Check if user already exists in database
      const { data: existingUser, error: userCheckError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingUser) {
        console.log('ℹ️ User already exists:', email);
        return { 
          success: false, 
          error: `A user with email ${email} already exists in system.` 
        };
      }

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        // PGRST116 is "No rows found" which is expected for new users
        console.error('❌ Error checking for existing user:', userCheckError);
        return { 
          success: false, 
          error: 'Error checking for existing user. Please try again.' 
        };
      }

      // Step 1: Create auth user using Supabase Admin API
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          }
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        
        // Handle duplicate email error (this is a fallback in case first check missed something)
        if (authError.message?.includes('already registered') || 
            authError.message?.includes('already in use')) {
          return { 
            success: false, 
            error: 'This email is already registered. Please use a different email address.' 
          };
        }
        
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error('❌ No user data returned');
        return { success: false, error: 'Failed to create user' };
      }

      const userId = authData.user.id;
      console.log('✅ Auth user created:', userId);

      // Step 2: Wait a bit for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Update profile with additional information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          company_id: companyId,
          position: 'Consultant',
          department: department,
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Profile update error:', profileError);
        
        // If profile doesn't exist yet, try to insert it
        if (profileError.code === 'PGRST116') {
          console.log('⚠️ Profile not found, creating...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              full_name: name,
              company_id: companyId,
              position: 'Consultant',
              department: department,
              role: role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('❌ Profile insert error:', insertError);
            return { success: false, error: 'Failed to create profile' };
          }
          
          console.log('✅ Profile created manually');
        } else {
          return { success: false, error: 'Failed to update profile' };
        }
      } else {
        console.log('✅ Profile updated successfully');
      }

      console.log('✅ Consultant created successfully:', name);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Unexpected error in addConsultantDirectly:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  const handleBulkImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowBulkImport(false);
    setIsImporting(false);
    toast({
      title: 'Import completed',
      description: 'The bulk import has finished processing.',
    });
  };

  const handleBulkImportStart = () => {
    setIsImporting(true);
  };

  return (
    <>
      <EmployeeList
        onAddEmployee={handleAddConsultant}
        additionalActions={
          <>
            {/* Added Bulk Update Button */}
            <Button 
              variant="gradient" 
              onClick={() => setShowBulkUpdate(true)}
              className="ml-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Bulk Update
            </Button>
            
            <Button 
              variant="gradient" 
              onClick={() => setShowBulkImport(true)}
              className="ml-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </>
        }
        refreshTrigger={refreshTrigger}
        title="Consultants"
        emptyTitle="No consultants found"
        emptySubtitle="Get started by adding your first consultant"
        addButtonLabel="Add Consultant"
        filterRole="employee"
      />
      
      {/* FIXED: Pass Supabase-direct function */}
      <BulkImportModal 
        open={showBulkImport} 
        onOpenChange={(open) => {
          if (!open && isImporting) {
            if (window.confirm('Import in progress. Are you sure you want to cancel?')) {
              setShowBulkImport(false);
              setIsImporting(false);
            }
          } else {
            setShowBulkImport(open);
          }
        }}
        onImportStart={handleBulkImportStart}
        onImportComplete={handleBulkImportComplete}
        addConsultant={addConsultantDirectly}
        isImporting={isImporting}
      />

      {/* Added BulkUpdateModal */}
      <BulkUpdateModal
        open={showBulkUpdate}
        onOpenChange={setShowBulkUpdate}
        onUpdateComplete={handleUpdateComplete}
      />    

      {/* Add Consultant Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Consultant
            </DialogTitle>
          </DialogHeader>
          <AddEmployeeForm onSuccess={handleCancel} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>    
    </>
  );
};

export default ProjectTeamManagement;
