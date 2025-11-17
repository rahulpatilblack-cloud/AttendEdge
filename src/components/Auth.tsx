import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Clock, UserPlus, LogIn } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { supabase } from '@/lib/supabase';
import { APP_NAME, APP_TAGLINE } from "../branding";

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    name: '', 
    role: 'admin' as 'employee' | 'admin' 
  });
  const { login, signup, isLoading, signupWithCompany, user } = useAuth();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showCompanyOnboarding, setShowCompanyOnboarding] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);

  // Helper: fetch user's company name
  const fetchUserCompanyName = async (userId: string) => {
    // Try employees table first
    let { data, error } = await supabase
      .from('employees')
      .select('company_id, company:company_id(name)')
      .eq('user_id', userId)
      .single();
    if (!error && data?.company?.name) return data.company.name;
    // Try profiles table as fallback
    ({ data, error } = await supabase
      .from('profiles')
      .select('company_id, company:company_id(name)')
      .eq('id', userId)
      .single());
    if (!error && data?.company?.name) return data.company.name;
    return null;
  };

  // Show onboarding modal after login/signup if company is 'Unassigned'
  useEffect(() => {
    const checkCompany = async () => {
      if (user) {
        const companyName = await fetchUserCompanyName(user.id);
        console.log('[Onboarding Debug] User:', user.id, 'Company:', companyName);
        setUserCompanyName(companyName);
        if (companyName === 'Unassigned' && !onboardingSuccess) {
          setShowCompanyOnboarding(true);
        } else {
          setShowCompanyOnboarding(false);
        }
      }
    };
    checkCompany();
    // eslint-disable-next-line
  }, [user, onboardingSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const result = await login(loginData.email, loginData.password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid email or password",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.email || !signupData.password || !signupData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    const { success, error } = await signup(signupData.email, signupData.password, signupData.name, signupData.role);
    if (success) {
      // The onboarding modal should only be triggered by the useEffect after login/signup, based on the user's company name
    } else {
      toast({
        title: "Signup Failed",
        description: error || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;
    setCompanyLoading(true);
    try {
      // 1. Insert new company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select()
        .single();
      if (companyError) throw companyError;

      // 2. Update user in employees table
      const { error: empError } = await supabase
        .from('employees')
        .update({ company_id: company.id, role: signupData.role })
        .eq('user_id', user.id);
      if (empError) throw empError;

      // 3. Update user in profiles table (if exists)
      await supabase
        .from('profiles')
        .update({ company_id: company.id, role: signupData.role })
        .eq('id', user.id);

      setOnboardingSuccess(true);
      setTimeout(() => {
        setShowCompanyOnboarding(false);
        setOnboardingSuccess(false);
        setCompanyName('');
        setUserCompanyName(company.name);
      }, 1500);
      toast({ title: 'Success', description: 'Company created and profile updated!', variant: 'default' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create company', variant: 'destructive' });
    }
    setCompanyLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <span 
  className="font-bold text-[38px]" 
  style={{ color: "#1702f9", fontFamily: "Cambria, serif" }}
>
  Attend
</span>
<span 
  className="font-bold text-[38px]" 
  style={{ color: "#39FF14", fontFamily: "Cambria, serif" }}
>
  Edge
</span>
         
          <p className="text-gray-600">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mx-auto">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">
              Sign In
            </h1>
            <p className="text-blue-100 mt-1">
              Sign in to your account to continue
            </p>
          </div>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@company.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="show-login-password"
                      type="checkbox"
                      checked={showLoginPassword}
                      onChange={() => setShowLoginPassword(v => !v)}
                    />
                    <label htmlFor="show-login-password" className="text-sm text-gray-700 select-none cursor-pointer">Show Password</label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    variant="gradient"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupData.name}
                      onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@company.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select value={signupData.role} onValueChange={(value: 'employee' | 'admin') => 
                      setSignupData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="show-signup-password"
                      type="checkbox"
                      checked={showSignupPassword}
                      onChange={() => setShowSignupPassword(v => !v)}
                    />
                    <label htmlFor="show-signup-password" className="text-sm text-gray-700 select-none cursor-pointer">Show Password</label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 gradient-primary text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            {/* Demo Credentials (moved here, compact) */}
            <div className="mt-6">
              <div className="font-semibold mb-2 text-sm">Demo Credentials</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border rounded p-3 text-gray-800 text-xs">
                  <div className="font-bold">Super Admin</div>
                  <div>Email: rahul@nytp.com</div>
                  <div>Password: password123</div>
                </div>
                <div className="bg-white border rounded p-3 text-gray-800 text-xs">
                  <div className="font-bold">Admin</div>
                  <div>Email: admin@company.com</div>
                  <div>Password: password123</div>
                </div>
                <div className="bg-white border rounded p-3 text-gray-800 text-xs">
                  <div className="font-bold">Employee</div>
                  <div>Email: employee@company.com</div>
                  <div>Password: password123</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <Clock className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Track Time</p>
          </div>
          <div className="space-y-2">
            <Users className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Manage Team</p>
          </div>
          <div className="space-y-2">
            <Building2 className="w-6 h-6 mx-auto text-blue-600" />
            <p className="text-xs text-gray-600">Enterprise Ready</p>
          </div>
        </div>

        {/* Post-signup onboarding modal */}
        <Dialog open={showCompanyOnboarding} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Your Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCompanyCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Company Name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
                disabled={companyLoading || onboardingSuccess}
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center"
                disabled={companyLoading || onboardingSuccess}
              >
                {companyLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : onboardingSuccess ? (
                  <span>Success! 🎉</span>
                ) : (
                  'Create Company'
                )}
              </button>
              {onboardingSuccess && (
                <div className="text-green-600 text-center font-semibold mt-2">Company created! Redirecting...</div>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
