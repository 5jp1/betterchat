import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WORDLE_ANSWER_URL = 'https://9000-firebase-studio-1769358540190.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev/raw.txt';

export async function GET() {
  try {
    const response = await fetch(WORDLE_ANSWER_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch wordle answer: ${response.statusText}`);
    }
    const text = await response.text();
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error('Wordle API fetch error:', error);
    // As a fallback, return a word so the game is still playable
    return new NextResponse('REACT', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
