import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { LeaveService } from '@/services/leaveService';
import { CreateLeaveInput } from '@/types/leaves';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const leaveData: CreateLeaveInput = await request.json();
    
    // Validate required fields
    if (!leaveData.consultantId || !leaveData.projectId || !leaveData.date || !leaveData.type) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Validate notes are provided
    if (!leaveData.notes?.trim()) {
      return new NextResponse('Notes are required', { status: 400 });
    }

    // For partial leaves, validate hours
    if (leaveData.type === 'partial' && (!leaveData.hours || leaveData.hours <= 0)) {
      return new NextResponse('Hours must be greater than 0 for partial leaves', { status: 400 });
    }

    const newLeave = await LeaveService.createLeave({
      ...leaveData,
      created_by: session.user.id,
    });

    return NextResponse.json(newLeave);
  } catch (error) {
    console.error('Error creating leave:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consultantId = searchParams.get('consultantId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    let leaves;
    if (consultantId) {
      leaves = await LeaveService.getLeavesByConsultant(consultantId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status as any,
        projectId: projectId || undefined,
      });
    } else if (projectId) {
      leaves = await LeaveService.getLeavesByProject(projectId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status as any,
      });
    } else {
      return new NextResponse('Either consultantId or projectId must be provided', { status: 400 });
    }

    return NextResponse.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
