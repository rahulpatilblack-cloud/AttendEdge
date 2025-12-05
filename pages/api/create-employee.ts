import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psankgxevxiiyclrzntp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Allow requests from your frontend origin
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  // Add other allowed origins as needed
];

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to set CORS headers
const setCorsHeaders = (res: NextApiResponse, origin: string) => {
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '';
    setCorsHeaders(res, origin);
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  const origin = req.headers.origin || '';
  setCorsHeaders(res, origin);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .insert([{
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        department: req.body.department,
        position: req.body.position,
        team_id: req.body.team_id,
        reporting_manager_id: req.body.reporting_manager_id,
        hire_date: req.body.hire_date,
        is_active: req.body.is_active,
        company_id: req.body.company_id,
        created_at: new Date(),
        updated_at: new Date()
      }])
      .select();

    if (error) {
      console.error('Error creating employee:', error);
      return res.status(400).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }

    return res.status(201).json({
      success: true,
      data: data[0],
      message: 'Employee created successfully'
    });
  } catch (error) {
    console.error('Error in create-employee API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// Handle CORS preflight for all methods
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
