import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/branding';

// Default branding
const defaultBranding = {
  name: APP_NAME,
  logo: "/attendedge-logo.png",
  primaryColor: "#1976D2",
  background: "#E3F2FD",
  slogan: APP_TAGLINE,
};

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [branding] = useState(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if we have a token in the URL (handled by the UpdatePassword page)
  useEffect(() => {
    const checkForToken = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // If we have a recovery token, redirect to the UpdatePassword page
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('Redirecting to update password with token');
          navigate(`/update-password?access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`);
          return;
        }

        // If we have an error in the URL, show it
        const error = urlParams.get('error') || hashParams.get('error');
        if (error) {
          setMessage(`Error: ${error}. Please try again.`);
        }
      } catch (error) {
        console.error('Error checking for token:', error);
        setMessage('An error occurred. Please try again.');
      }
    };

    checkForToken();
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      // Use production URL for password reset to ensure consistency
      const redirectUrl = `https://attendedge.netlify.app/update-password`;
      console.log('Sending password reset email to:', email);
      console.log('Redirect URL:', redirectUrl);
      
      // Send password reset email with redirect
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) throw error;
      
      setMessage('Password reset link sent! Please check your email.');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setMessage(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-primary/90 rounded-2xl flex items-center justify-center mb-4 shadow-md">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">
            <span style={{color: '#1702f9', fontSize: '38px', fontFamily: 'Cambria, serif', textShadow: '0 0 5px rgba(30,110,247,0.7)'}}>{APP_NAME}</span>
          </h1>
          <p className="text-muted-foreground">
            {branding.slogan}
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-center">Forgot your password?</CardTitle>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent>
              {message && (
                <div 
                  className={`mb-4 p-3 rounded-md ${
                    message.includes('sent!') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {message}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full"
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
              
              <div className="text-center text-sm">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  onClick={() => navigate('/login')}
                >
                  Back to sign in
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};