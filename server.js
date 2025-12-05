import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Log environment variables for debugging (be careful with this in production)
console.log('Environment variables:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase admin client
console.log('Initializing Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  }
});

// Create admin client for auth operations
const adminAuthClient = supabase.auth.admin;
console.log('Supabase client and admin client initialized');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    supabase_connected: !!supabase,
    env_vars: {
      has_supabase_url: !!supabaseUrl,
      has_service_key: !!supabaseServiceKey
    }
  });
});

// Check if email exists in auth.users or employees table
async function checkEmailExists(email) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('Checking if email exists:', normalizedEmail);
  
  try {
    // Check auth.users using direct API call
    const authUsersResponse = await fetch(
      `${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users?filter=email@eq.${encodeURIComponent(normalizedEmail)}`, 
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    
    if (!authUsersResponse.ok) {
      const error = await authUsersResponse.json();
      throw new Error(error.message || 'Failed to check auth users');
    }
    
    const authUsers = await authUsersResponse.json();
    const emailExistsInAuth = authUsers && authUsers.length > 0;
    
    if (emailExistsInAuth) {
      console.log('Email exists in auth.users:', normalizedEmail);
      return {
        exists: true,
        inAuth: true,
        inEmployees: false,
        existingEmployee: null
      };
    }

    // Check employees table
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (employeeError) {
      console.error('Error checking employee email:', employeeError);
      throw employeeError;
    }

    return {
      exists: !!employee,
      inAuth: false,
      inEmployees: !!employee,
      existingEmployee: employee || null
    };
  } catch (error) {
    console.error('Error in checkEmailExists:', error);
    throw error; // Re-throw to be handled by the calling function
  }
}

// Create employee endpoint
app.post('/create-employee', async (req, res) => {
  console.log('Received request to create employee:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      name, 
      email, 
      password, 
      role = 'employee', 
      department = null, 
      position = null, 
      team_id = null, 
      reporting_manager_id = null, 
      hire_date = null, 
      is_active = true, 
      company_id = null
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Name, email, and password are required',
        received: { name: !!name, email: !!email, password: !!password }
      });
    }

    // Check if email already exists with more robust error handling
    let emailCheck;
    try {
      emailCheck = await checkEmailExists(email);
      if (emailCheck.exists) {
        return res.status(409).json({
          error: 'Email already exists',
          details: emailCheck.inAuth 
            ? 'A user with this email already exists in the authentication system' 
            : 'An employee with this email already exists in the database',
          code: emailCheck.inAuth ? 'auth/email-already-exists' : 'employee/email-already-exists',
          existingRecord: emailCheck.existingEmployee ? {
            id: emailCheck.existingEmployee.id,
            email: emailCheck.existingEmployee.email
          } : undefined
        });
      }
    } catch (emailCheckError) {
      console.error('Error checking email existence:', emailCheckError);
      // Continue with the request if we can't verify email existence
      // The database unique constraint will catch any duplicates
      console.warn('Proceeding with employee creation despite email check error');
    }

    console.log('Attempting to create auth user...');
    
    // 1. First create the auth user
    const userEmail = email.toLowerCase().trim();
    console.log('Creating auth user with email:', userEmail);
    
    try {
      // First, check if user already exists in auth
      const checkResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        }
      );
      
      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        console.error('Error checking user existence:', error);
      } else {
        const existingUsers = await checkResponse.json();
        if (existingUsers && existingUsers.length > 0) {
          console.log('User already exists in auth:', existingUsers[0].id);
          return res.status(409).json({
            error: 'User already exists',
            message: 'A user with this email already exists in the authentication system',
            userId: existingUsers[0].id
          });
        }
      }
      console.log('Creating user with service role key (first 10 chars):', supabaseServiceKey.substring(0, 10) + '...');
      
      const userData = {
        email: userEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name,
          full_name: name,
          avatar_url: ''
        },
        app_metadata: {
          provider: 'email',
          roles: [role]
        }
      };

      let createUserResponse;
      let authData;
      
      try {
        console.log('Sending user creation request to Supabase...');
        createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(userData),
          timeout: 10000 // 10 second timeout
        });

        authData = await createUserResponse.json().catch(parseError => {
          console.error('Failed to parse auth response:', parseError);
          throw new Error('Invalid response received from authentication service');
        });
        
        console.log('Auth API Response Status:', createUserResponse.status);
        console.log('Auth API Response:', JSON.stringify(authData, null, 2));
        
        if (!createUserResponse.ok) {
          const errorMessage = authData?.message || 
                             authData?.error_description || 
                             authData?.error || 
                             `Failed to create auth user: ${createUserResponse.statusText}`;
          
          console.error('Auth API Error:', {
            status: createUserResponse.status,
            statusText: createUserResponse.statusText,
            error: errorMessage,
            response: authData
          });
          
          // Handle specific error cases
          if (createUserResponse.status === 400) {
            throw new Error(`Invalid request: ${errorMessage}`);
          } else if (createUserResponse.status === 401) {
            throw new Error('Authentication failed: Invalid service role key');
          } else if (createUserResponse.status === 422) {
            throw new Error(`Validation error: ${errorMessage}`);
          } else if (createUserResponse.status >= 500) {
            throw new Error('Authentication service is currently unavailable. Please try again later.');
          }
          
          throw new Error(errorMessage);
        }
        
        if (!authData || !authData.id) {
          throw new Error('Invalid response format from authentication service');
        }
      } catch (error) {
        console.error('Error during user creation:', {
          error: error.message,
          stack: error.stack,
          response: createUserResponse ? {
            status: createUserResponse.status,
            statusText: createUserResponse.statusText
          } : 'No response received'
        });
        
        // Rethrow with more context if needed
        if (error.name === 'AbortError') {
          throw new Error('Request to authentication service timed out');
        } else if (error.message.includes('fetch failed')) {
          throw new Error('Failed to connect to authentication service. Please check your network connection.');
        }
        
        throw error; // Re-throw the error to be caught by the outer try-catch
      }
      
      console.log('Auth user created successfully:', authData.id);
      
      // Get the user ID from the auth response
      const userId = authData.id || (authData.user ? authData.user.id : null);
      
      if (!userId) {
        throw new Error('Failed to get user ID from auth response');
      }
      
      console.log(`Auth user created successfully with ID: ${userId}`);

      // 1. First verify the auth user exists and is accessible
      console.log('Verifying auth user before creating employee record...');
      const { data: verifiedUser, error: verifyError } = await supabase.auth.admin.getUserById(userId);
      
      if (verifyError || !verifiedUser) {
        console.error('Failed to verify auth user:', verifyError);
        await cleanupAuthUser(userId);
        throw new Error('Failed to verify authentication user was created successfully');
      }

      console.log('Auth user verified successfully, proceeding with employee creation...');
      
      // 2. Prepare employee data with default values
      const employeeData = {
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        role,
        role_id: '8aab987f-ceb2-45bd-80b0-495f53dc034c', // Default role_id
        department,
        position,
        team_id,
        reporting_manager_id,
        hire_date: hire_date || new Date().toISOString().split('T')[0],
        is_active: is_active !== undefined ? is_active : true, // Default to true if not provided
        company_id: '91fc12c5-61ad-4776-8685-2ab18ee01274', // Default company_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 3. Create employee record
      console.log('Creating employee record...');
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (employeeError) {
        console.error('Error creating employee record:', employeeError);
        
        // Clean up auth user if employee creation fails
        console.log('Cleaning up auth user due to employee creation failure...');
        await cleanupAuthUser(userId);
        
        // Handle specific database errors
        if (employeeError.code === '23505') { // unique_violation
          throw new Error('An employee with this email already exists');
        }
        
        throw new Error(`Failed to create employee record: ${employeeError.message}`);
      }

      if (!employee) {
        console.error('No employee data returned after creation');
        await cleanupAuthUser(userId);
        throw new Error('Failed to create employee record: No data returned');
      }

      console.log('Employee record created successfully:', employee.id);
      return res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      });

    } catch (error) {
      console.error('Error in employee creation process:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // If we have a userId at this point, try to clean up
      if (userId) {
        try {
          await cleanupAuthUser(userId);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create employee',
        message: error.message,
        ...(process.env.NODE_ENV !== 'production' && { details: error.stack })
      });
    }

    // Helper function to clean up auth user if employee creation fails
    async function cleanupAuthUser(userId) {
      if (!userId) return;
      
      console.log(`Attempting to clean up auth user: ${userId}`);
      try {
        const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          console.error('Failed to clean up auth user:', {
            status: deleteResponse.status,
            statusText: deleteResponse.statusText,
            error: errorData
          });
        } else {
          console.log(`Successfully cleaned up auth user: ${userId}`);
        }
      } catch (cleanupError) {
        console.error('Error during auth user cleanup:', cleanupError);
      }
    };

    // Employee creation logic is handled in the main flow above
    
    } catch (employeeError) {
      console.error('Error creating employee record:', {
        error: employeeError,
        userId: userId,
        timestamp: new Date().toISOString()
      });
      
      // Clean up auth user since employee creation failed
      try {
        await cleanupAuthUser(userId);
      } catch (cleanupError) {
        console.error('Error during cleanup after employee creation failure:', cleanupError);
      }
      
      // Handle specific error codes
      if (employeeError.code === '23505') { // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Email already exists',
          message: 'The email address is already registered in the system',
          code: 'duplicate-email',
          field: 'email'
        });
      }
      
      // Return error response
      return res.status(500).json({
        success: false,
        error: 'Failed to create employee',
        message: employeeError.message,
        ...(process.env.NODE_ENV !== 'production' && { details: employeeError.stack })
      });
    }

    console.log('Employee created successfully:', employee);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Employee created successfully',
      data: {
        ...employee,
        // Don't include sensitive data in the response
        password: undefined
      }
    });

  } catch (error) {
    console.error('Unexpected error in create-employee endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get employee by ID endpoint
app.get('/employees/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[GET /employees/${id}] Request received`);

  if (!id) {
    return res.status(400).json({ 
      error: 'Employee ID is required',
      success: false 
    });
  }

  try {
    console.log(`[GET /employees/${id}] Fetching employee...`);
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !employee) {
      console.log(`[GET /employees/${id}] Employee not found:`, error?.message);
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        message: `No employee found with ID: ${id}`
      });
    }

    console.log(`[GET /employees/${id}] Employee found`);
    return res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error(`[GET /employees/${id}] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Update employee endpoint
app.put('/employees/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[PUT /employees/${id}] Request received`);

  if (!id) {
    return res.status(400).json({ 
      error: 'Employee ID is required',
      success: false 
    });
  }

  try {
    const { 
      name, 
      email, 
      role, 
      department, 
      position, 
      team_id, 
      reporting_manager_id, 
      hire_date, 
      is_active
    } = req.body;

    // First, update the auth user if email or name changed
    if (email || name || role) {
      console.log(`[PUT /employees/${id}] Updating auth user...`);
      const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(id, {
        email: email,
        user_metadata: { name: name },
        app_metadata: { role: role }
      });

      if (authError) {
        console.error(`[PUT /employees/${id}] Error updating auth user:`, authError);
        return res.status(400).json({
          success: false,
          error: 'Failed to update authentication details',
          message: authError.message,
          code: authError.status
        });
      }
      console.log(`[PUT /employees/${id}] Auth user updated successfully`);
    }

    // Prepare update data for employee record
    const updateData = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(role && { role }),
      ...(department !== undefined && { department }),
      ...(position !== undefined && { position }),
      ...(team_id !== undefined && { team_id: team_id || null }),
      ...(reporting_manager_id !== undefined && { reporting_manager_id: reporting_manager_id || null }),
      ...(hire_date && { hire_date }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date().toISOString()
    };

    // Update employee record
    console.log(`[PUT /employees/${id}] Updating employee with data:`, updateData);
    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[PUT /employees/${id}] Error updating employee:`, updateError);
      return res.status(400).json({
        success: false,
        error: 'Failed to update employee',
        message: updateError.message,
        code: updateError.code
      });
    }

    if (!updatedEmployee) {
      console.log(`[PUT /employees/${id}] No employee found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        message: `No employee found with ID: ${id}`
      });
    }

    console.log(`[PUT /employees/${id}] Employee updated successfully`);
    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    });

  } catch (error) {
    console.error(`[PUT /employees/${id}] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Delete employee endpoint
app.delete('/employees/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DELETE /employees/${id}] Request received`);

  if (!id) {
    console.error('No employee ID provided');
    return res.status(400).json({ 
      error: 'Employee ID is required',
      success: false
    });
  }

  try {
    // 1. First try to delete the auth user
    console.log(`[DELETE /employees/${id}] Attempting to delete auth user...`);
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) {
      // If user not found in auth, it might have been deleted already
      if (authError.status === 404) {
        console.log(`[DELETE /employees/${id}] Auth user not found, continuing with employee record deletion`);
      } else {
        console.error(`[DELETE /employees/${id}] Error deleting auth user:`, authError);
        // Continue to try deleting the employee record even if auth user deletion fails
      }
    } else {
      console.log(`[DELETE /employees/${id}] Auth user deleted successfully`);
    }

    // 2. Delete the employee record
    console.log(`[DELETE /employees/${id}] Attempting to delete employee record...`);
    const { data, error: deleteError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      console.error(`[DELETE /employees/${id}] Error deleting employee record:`, deleteError);
      return res.status(400).json({
        success: false,
        error: 'Failed to delete employee record',
        message: deleteError.message,
        code: deleteError.code
      });
    }

    if (!data) {
      console.log(`[DELETE /employees/${id}] No employee found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        message: `No employee found with ID: ${id}`
      });
    }

    console.log(`[DELETE /employees/${id}] Employee deleted successfully`);
    return res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      data: {
        id: data.id,
        email: data.email,
        name: data.name
      }
    });

  } catch (error) {
    console.error(`[DELETE /employees/${id}] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
  console.log('Available endpoints:');
  console.log(`  GET    /employees/:id   - Get employee by ID`);
  console.log(`  POST   /create-employee - Create a new employee`);
  console.log(`  PUT    /employees/:id   - Update an employee`);
  console.log(`  DELETE /employees/:id   - Delete an employee`);
  console.log(`  GET    /health         - Health check endpoint`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
