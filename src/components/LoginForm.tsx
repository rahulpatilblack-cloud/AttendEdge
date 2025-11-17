import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Clock } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from "../branding";

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const success = await login(email, password);
    
    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Successfully logged in",
      });
    }
  };

  const demoCredentials = [
    { role: 'Admin', email: 'admin@company.com', password: 'admin123' },
    { role: 'Employee', email: 'employee@company.com', password: 'emp123' },
    { role: 'Employee', email: 'alice@company.com', password: 'alice123' },
    { role: 'Employee', email: 'bob@company.com', password: 'bob123' },
    { role: 'Employee', email: 'carol@company.com', password: 'carol123' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-primary/90 rounded-2xl flex items-center justify-center mb-4 shadow-md">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">
            <span style={{color: '#1702f9', fontSize: '38px', fontFamily: 'Cambria, serif', textShadow: '0 0 5px rgba(30,110,247,0.7)'}}>Attend</span>
            <span style={{color: '#39FF14', fontSize: '38px', fontFamily: 'Cambria, serif', textShadow: '0 0 5px rgba(57,255,20,0.7)'}}>Edge</span>
          </h1>
          <p className="text-muted-foreground">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Login Form */}
        <Card className="border-0 shadow-xl bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                <Input
                  id="password"
                    type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                  >
                    EYE
                  </button>
                </div>
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
            {/* Demo Credentials (moved here, compact) */}
            <div className="mt-6">
              <div className="font-semibold mb-2">Demo Credentials</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card border rounded-lg p-3 text-foreground shadow-sm hover:shadow transition-shadow">
                  <div className="font-bold text-primary">Super Admin</div>
                  <div className="text-sm text-muted-foreground">rahul@nytp.com</div>
                  <div className="text-sm text-muted-foreground">password123</div>
                </div>
                <div className="bg-card border rounded-lg p-3 text-foreground shadow-sm hover:shadow transition-shadow">
                  <div className="font-bold text-primary">Admin</div>
                  <div className="text-sm text-muted-foreground">admin@company.com</div>
                  <div className="text-sm text-muted-foreground">password123</div>
                </div>
                <div className="bg-card border rounded-lg p-3 text-foreground shadow-sm hover:shadow transition-shadow">
                  <div className="font-bold text-primary">Employee</div>
                  <div className="text-sm text-muted-foreground">employee@company.com</div>
                  <div className="text-sm text-muted-foreground">password123</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Track Time</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Manage Team</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Enterprise Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
