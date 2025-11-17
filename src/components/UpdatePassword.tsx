import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const UpdatePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initializePasswordReset = async () => {
      try {
        // Sign out any existing sessions
        await supabase.auth.signOut();
        
        // Parse the hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('Password reset params:', { accessToken, refreshToken, type });
        
        if (!accessToken || !refreshToken || type !== 'recovery') {
          throw new Error('Invalid password reset link. Please use the link from your email.');
        }
        
        // Set the session using the tokens from the URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          throw new Error('Invalid or expired reset link. Please request a new one.');
        }
        
        console.log('Password reset session initialized successfully');
        
      } catch (err: any) {
        console.error('Password reset initialization error:', err);
        setError(err.message || 'Failed to initialize password reset. Please try again.');
        toast({
          title: 'Error',
          description: err.message || 'Failed to initialize password reset',
          variant: 'destructive',
        });
      }
    };
    
    initializePasswordReset();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Updating password...');
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      
      if (updateError) throw updateError;

      console.log('Password updated successfully');
      
      // Show success message
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully. Redirecting to login...',
      });
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. The link may have expired. Please request a new reset link.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const accessToken = searchParams.get('access_token');
  const type = searchParams.get('type');
  const refreshToken = searchParams.get('refresh_token');
  
  // If we don't have tokens in the URL, check the hash fragment
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessTokenFromHash = hashParams.get('access_token');
  const refreshTokenFromHash = hashParams.get('refresh_token');
  const typeFromHash = hashParams.get('type');
  
  const hasValidTokens = (accessToken && refreshToken && type === 'recovery') || 
                       (accessTokenFromHash && refreshTokenFromHash && typeFromHash === 'recovery');
  
  if (error || !hasValidTokens) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error || 'Invalid password reset link. Please use the link from your email.'}
          </p>
          <p className="mt-4 text-sm text-gray-600">
            The password reset link may have expired or is invalid. 
            Please request a new password reset link from the login page.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return to Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/login'}
            className="w-full"
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default UpdatePassword;
