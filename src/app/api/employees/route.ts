import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify user has permission to add employees
    const { data: userData, error: userError } = await supabase
      .from('employees')
      .select('role, company_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const requestData = await request.json();
    const { email, name, role = 'employee', department, position } = requestData;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists in auth
    const { data: existingUser } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An employee with this email already exists' },
        { status: 400 }
      );
    }

    // First create the employee record with a temporary ID
    const newEmployee = {
      email,
      name,
      role,
      department,
      position,
      company_id: userData.company_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert the employee record
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert([newEmployee])
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee record:', employeeError);
      throw employeeError;
    }

    // Generate a random password for the user
    const password = Math.random().toString(36).slice(-8) + 'A1!';
    
    // Create auth user using the client-side signUp method
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          company_id: userData.company_id,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (signUpError) {
      console.error('Error creating auth user:', signUpError);
      // Delete the employee record if auth creation fails
      await supabase
        .from('employees')
        .delete()
        .eq('id', employeeData.id);
      throw signUpError;
    }

    // Update the employee record with the auth user ID if available
    if (authData.user) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_id: authData.user.id })
        .eq('id', employeeData.id);

      if (updateError) {
        console.error('Error updating employee with auth ID:', updateError);
      }
    }

    // TODO: Send welcome email with password reset link

    return NextResponse.json(
      { message: 'Employee added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
