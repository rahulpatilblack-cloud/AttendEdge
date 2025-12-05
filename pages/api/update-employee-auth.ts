import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, email, name, role } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if the user has permission to update this employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Only allow admins to update other users
    if (user.id !== id && user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update the user
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(id, {
      email,
      password: undefined,
      user_metadata: { name, role },
    });

    if (updateError) {
      console.error('Error updating auth user:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in update-employee-auth:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
