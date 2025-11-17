import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, Lock } from "lucide-react";

// Branding component to match Auth.tsx
const Branding = () => (
  <div className="text-center space-y-2">
    <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4">
      <Lock className="w-8 h-8 text-white" />
    </div>
    <div>
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
    </div>
  </div>
);

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error' | 'info'}>();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        setIsLoading(true);
        setMessage('');
        
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        console.log('URL Params:', { accessToken, refreshToken, type });
        
        if (!accessToken || !refreshToken || type !== 'recovery') {
          throw new Error('Invalid or expired reset link. Please request a new one.');
        }
        
        // Set the session with the token
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        console.log('Session data:', data);
        
        if (sessionError) throw sessionError;
        
        // Clear the URL to prevent re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error: any) {
        console.error('Error verifying session:', error);
        // Don't show the error message to the user
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters long.",
        type: 'error'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({
        text: "Passwords do not match.",
        type: 'error'
      });
      return;
    }
    
    setIsLoading(true);
    setMessage(undefined);
    
    try {
      // Get the current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Your session has expired. Please request a new password reset link.');
      }
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      // Show success message with icon
      setMessage({
        text: "Password updated successfully! Redirecting to login...",
        type: 'success'
      });
      
      // Sign out and redirect to login after a short delay
      await supabase.auth.signOut();
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      setMessage({
        text: error.error_description || error.message || "Error updating password. Please try again.",
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center p-4">
      {/* Branding */}
      <div className="mb-8 text-center">
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
      </div>
      
      {/* Card */}
      <div className="w-full max-w-2xl">
        <Card className="w-full overflow-hidden shadow-xl border-0">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">
              Set New Password
            </h1>
            <p className="text-blue-100 mt-1">
              Create a strong, unique password to secure your account
            </p>
          </div>
          
          <CardContent className="p-8">
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              {message && (
                <div className={`p-4 rounded-lg border ${
                  message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                  message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-center">
                    {message.type === 'error' ? (
                      <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : message.type === 'success' ? (
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-medium">{message.text}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <span className="text-xs text-gray-500">
                      {password.length > 0 ? `${password.length}/8+ characters` : ''}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                      minLength={8}
                      disabled={isLoading}
                      className={`h-12 px-4 text-base border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        password.length > 0 && password.length < 8 ? 'border-yellow-500' : ''
                      }`}
                    />
                    {password.length > 0 && (
                      <div className="h-1 mt-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            password.length < 4 ? 'bg-red-500' : 
                            password.length < 8 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (password.length / 12) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Use at least 8 characters with a mix of letters, numbers & symbols
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    disabled={isLoading}
                    className={`h-12 px-4 text-base border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      confirmPassword && password !== confirmPassword ? 'border-red-500' : ''
                    }`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords don't match</p>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  variant="default"
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </span>
                  )}
                </Button>
                
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    disabled={isLoading}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
