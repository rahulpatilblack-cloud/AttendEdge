import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Employee delete request received:', { method: req.method, query: req.query });
  
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    console.error('Invalid employee ID:', id);
    return res.status(400).json({ 
      error: 'Employee ID is required',
      details: 'No valid employee ID provided in the request' 
    });
  }

  try {
    // First, get the employee to check permissions
    console.log('Fetching employee details for ID:', id);
    const { data: employee, error: fetchError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching employee:', fetchError);
      return res.status(404).json({ 
        error: 'Error fetching employee',
        details: fetchError.message 
      });
    }

    if (!employee) {
      console.error('Employee not found with ID:', id);
      return res.status(404).json({ 
        error: 'Employee not found',
        details: `No employee found with ID: ${id}` 
      });
    }

    // Delete the auth user
    console.log('Attempting to delete auth user:', id);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      // Continue to mark as inactive even if auth deletion fails
      // But include the auth error in the response for debugging
      return res.status(500).json({ 
        error: 'Failed to delete authentication user',
        details: authError.message,
        code: authError.status || 'AUTH_ERROR'
      });
    }

    // Mark the employee as inactive in the database
    console.log('Marking employee as inactive:', id);
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating employee status:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update employee status',
        details: updateError.message,
        hint: updateError.hint || ''
      });
    }

    console.log('Successfully processed employee deletion for ID:', id);
    return res.status(200).json({ 
      success: true,
      message: 'Employee successfully deactivated',
      employeeId: id
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('Unexpected error in delete employee API:', { 
      error: errorMessage,
      stack,
      employeeId: id
    });
    
    return res.status(500).json({ 
      error: 'An unexpected error occurred while deleting the employee',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
