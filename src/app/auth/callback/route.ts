import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/radar';
  const type = searchParams.get('type');

  // Use the published site URL as the base for redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.nomorequiet.com';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // For password recovery, redirect to the update-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${siteUrl}/update-password`);
      }
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/login`);
}
