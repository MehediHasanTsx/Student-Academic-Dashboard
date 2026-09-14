import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/auth/demo';

export async function POST() {
  // In demo mode, just return success
  if (isDemoMode()) {
    return NextResponse.json({ success: true });
  }

  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
