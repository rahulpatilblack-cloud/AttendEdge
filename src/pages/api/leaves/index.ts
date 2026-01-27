// src/pages/api/leaves/index.ts
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ProjectLeave, ProjectLeaveInput, ProjectLeaveUpdate } from '@/types/leaves';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGetLeaves(req, res);
    case 'POST':
      return handleCreateLeave(req, res);
    case 'PUT':
      return handleUpdateLeave(req, res);
    case 'DELETE':
      return handleDeleteLeave(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
  }
}

// Get leaves with optional filters
async function handleGetLeaves(req: NextApiRequest, res: NextApiResponse) {
  const { consultant_id, project_id, start_date, end_date, status } = req.query;

  try {
    let query = supabase
      .from('project_leaves')
      .select('*');

    if (consultant_id) {
      query = query.eq('consultant_id', consultant_id);
    }

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    if (start_date && end_date) {
      query = query.gte('date', start_date).lte('date', end_date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Create a new leave
async function handleCreateLeave(req: NextApiRequest, res: NextApiResponse) {
  const leaveData: ProjectLeaveInput = req.body;

  try {
    // Validate required fields
    if (!leaveData.consultant_id || !leaveData.project_id || !leaveData.date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if leave already exists for this consultant, project, and date
    const { data: existingLeave } = await supabase
      .from('project_leaves')
      .select('id')
      .eq('consultant_id', leaveData.consultant_id)
      .eq('project_id', leaveData.project_id)
      .eq('date', leaveData.date)
      .single();

    if (existingLeave) {
      return res.status(409).json({ 
        error: 'Leave already exists for this consultant, project, and date' 
      });
    }

    // Insert the new leave
    const { data, error } = await supabase
      .from('project_leaves')
      .insert([{ ...leaveData, created_by: req.user?.id }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Update an existing leave
async function handleUpdateLeave(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const updateData: ProjectLeaveUpdate = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('project_leaves')
      .update({ 
        ...updateData, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// Delete a leave
async function handleDeleteLeave(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Leave ID is required' });
  }

  try {
    const { error } = await supabase
      .from('project_leaves')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(204).end();
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}