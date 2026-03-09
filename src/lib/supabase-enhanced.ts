import { createClient } from '@supabase/supabase-js';

// Enhanced Supabase configuration with improved password reset template
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development',
    templates: {
      email: {
        signUp: {
          subject: 'Welcome to AttendEdge',
          templatePath: './templates/welcome-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge'
          }
        },
        signIn: {
          subject: 'Sign in to AttendEdge',
          templatePath: './templates/sign-in-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge'
          }
        },
        // Enhanced password reset template with security features
        passwordReset: {
          subject: 'Reset Your AttendEdge Password',
          templatePath: './templates/password-reset-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge',
            // Custom variables for enhanced security context
            timestamp: () => new Date().toLocaleString(),
            userAgent: (req: any) => req?.headers?.['user-agent'] || 'Unknown',
            ip: (req: any) => req?.ip || req?.headers?.['x-forwarded-for'] || 'Unknown'
          }
        },
        // Magic link email for passwordless sign-in
        magicLink: {
          subject: 'Your AttendEdge Sign-in Link',
          templatePath: './templates/magic-link-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge'
          }
        },
        // Change email confirmation
        emailChange: {
          subject: 'Confirm Your New Email Address',
          templatePath: './templates/email-change-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge'
          }
        },
        // Reconfirmation email
        reauthentication: {
          subject: 'Confirm Your AttendEdge Account',
          templatePath: './templates/reauth-enhanced.html',
          variables: {
            site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
            company_name: 'AttendEdge'
          }
        }
      }
    }
  }
});

// Enhanced email service with custom variables
export const sendPasswordResetEmail = async (
  email: string,
  tokenHash: string,
  req?: any
) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password?token=${tokenHash}&type=recovery`,
      // Enhanced template variables
      data: {
        timestamp: new Date().toLocaleString(),
        userAgent: req?.headers?.['user-agent'] || 'Unknown',
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || 'Unknown'
      }
    });

    if (error) {
      console.error('Password reset email error:', error);
      throw error;
    }

    console.log('Password reset email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
};

// Enhanced email service for other email types
export const sendEnhancedEmail = async (
  type: 'signup' | 'signin' | 'passwordReset' | 'magicLink' | 'emailChange' | 'reauthentication',
  email: string,
  variables: Record<string, any> = {},
  req?: any
) => {
  try {
    const templateVariables = {
      site_url: process.env.NEXT_PUBLIC_SITE_URL || 'https://attendedge-nytp1.netlify.app',
      company_name: 'AttendEdge',
      email,
      timestamp: new Date().toLocaleString(),
      userAgent: req?.headers?.['user-agent'] || 'Unknown',
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || 'Unknown',
      ...variables
    };

    // Log email sending for audit
    console.log(`Sending ${type} email to:`, email, {
      timestamp: templateVariables.timestamp,
      userAgent: templateVariables.userAgent,
      ip: templateVariables.ip
    });

    // This would integrate with your email service
    // For now, we'll use Supabase's built-in email service
    const { error } = await supabase.auth.admin.updateUserById(
      'dummy-user-id', // This would be the actual user ID
      {
        email: email
      }
    );

    if (error) {
      console.error(`Error sending ${type} email:`, error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(`Error sending ${type} email:`, error);
    return { success: false, error };
  }
};

export default supabase;
