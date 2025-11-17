import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ResetPasswordProps {
  email: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ email, onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [emailInput, setEmailInput] = useState(email);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    
    setIsLoading(true);
    try {
      // Get the current URL parameters to preserve any tenant information
      const urlParams = new URLSearchParams(window.location.search);
      const tenant = urlParams.get('tenant') || 'attendedge';
      
      // Construct the redirect URL with the correct parameters
      // Use the production URL for password reset links to ensure consistency
      const redirectUrl = `https://attendedge.netlify.app/reset-password?type=recovery`;
      
      console.log('Sending password reset email to:', emailInput);
      console.log('Redirect URL:', redirectUrl);
      
      // Send the password reset email with options
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailInput, {
        redirectTo: redirectUrl,
        // Add any additional options needed for your Supabase configuration
      });

      if (resetError) {
        console.error('Password reset error:', resetError);
        throw resetError;
      }
      
      setShowConfirmation(true);
      if (onSuccess) onSuccess();
      
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for instructions to reset your password. The link will be valid for 1 hour.',
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showConfirmation) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We've sent password reset instructions to <span className="font-medium">{emailInput}</span>.
            Please check your email and follow the instructions to reset your password.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onCancel}>Close</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleResetPassword}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={!!email}
            />
          </div>
          <p className="text-sm text-gray-600">
            We'll send you a link to reset your password.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default ResetPassword;
