import { NextResponse } from 'next/server';
import { fetchSupabaseQuestionBank } from '@/lib/supabase-data';

export async function GET() {
  try {
    const { questions, error } = await fetchSupabaseQuestionBank();
    return NextResponse.json(
      {
        questions,
        error: error ?? null,
        count: questions.length,
      },
      { status: questions.length ? 200 : 206 },
    );
  } catch (error) {
    console.error('[supabase-questions] unexpected error', error);
    return NextResponse.json(
      {
        questions: [],
        error: 'Failed to load Supabase data',
      },
      { status: 500 },
    );
  }
}
