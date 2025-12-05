import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import path from 'path';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the project root
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

console.log('Environment variables loaded from:', envPath);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Exit if required environment variables are not set
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  console.error('Please set it in your .env file in the project root');
  process.exit(1);
}

const app = express();
const port = 3001; // Different from your frontend port (8080)

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psankgxevxiiyclrzntp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create employee endpoint
app.post('/api/create-employee', async (req, res) => {
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
        success: false,
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
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('CORS-enabled for:', ['http://localhost:8080', 'http://localhost:3000']);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});
