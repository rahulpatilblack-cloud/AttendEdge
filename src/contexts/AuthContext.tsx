import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'reporting_manager' | 'admin' | 'super_admin';
  department?: string;
  position?: string;
  platform_super_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, role?: 'employee' | 'reporting_manager' | 'admin') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  signupWithCompany: (
    email: string,
    password: string,
    name: string,
    companyName: string,
    role?: 'employee' | 'admin'
  ) => Promise<{ success: boolean; error?: string }>;
  platform_super_admin?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        // Use setTimeout to avoid recursion issues
        setTimeout(async () => {
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setIsLoading(false);
          }
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      console.log('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: profile, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setIsLoading(false);
        return;
      }

      if (profile) {
        console.log('Profile fetched successfully:', profile);
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role as 'employee' | 'reporting_manager' | 'admin' | 'super_admin',
          department: profile.department,
          position: profile.position,
          platform_super_admin: profile.platform_super_admin || false,
        });
      } else {
        console.log('No profile found for user:', userId);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('Attempting login for:', email);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        // Don't call fetchUserProfile here - let the auth state change handle it
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: 'employee' | 'reporting_manager' | 'admin' = 'employee'
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('Attempting signup for:', email);
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('Signup successful for user:', data.user.id);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    console.log('Logging out user');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear all localStorage and sessionStorage data related to the app
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key === 'selectedCompany') localStorage.removeItem(key);
    });
    sessionStorage.clear();
  };

  const signupWithCompany = async (
    email: string,
    password: string,
    name: string,
    companyName: string,
    role: 'employee' | 'admin' = 'admin'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      // 1. Create company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select()
        .single();
      if (companyError || !companyData) {
        setIsLoading(false);
        return { success: false, error: companyError?.message || 'Failed to create company' };
      }
      // 2. Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          }
        }
      });
      if (authError || !authData.user) {
        setIsLoading(false);
        return { success: false, error: authError?.message || 'Failed to create user' };
      }
      // 3. Create employee profile
      const { error: profileError } = await supabase
        .from('employees')
        .insert([{
          id: authData.user.id,
          email,
          name,
          company_id: companyData.id,
          role,
        }]);
      if (profileError) {
        setIsLoading(false);
        return { success: false, error: profileError.message };
      }
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading, signupWithCompany, platform_super_admin: user?.platform_super_admin || false }}>
      {children}
    </AuthContext.Provider>
  );
};
