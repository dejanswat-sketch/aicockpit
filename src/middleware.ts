import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_EMAILS = ['dejanwarrior@gmail.com', 'dejanswat@gmail.com'];
const PROTECTED_ROUTES = ['/radar', '/ai-brain', '/vault', '/laboratorija', '/submissions'];
const AUTH_ROUTES = ['/login'];
const BLOCKED_ROUTES = ['/register'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── BYPASS: /auth/callback must pass through BEFORE any session check ──
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  // ── BLOCK: /register is disabled — redirect to login ──
  if (BLOCKED_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Email allowlist check — signed-in users not on the list get kicked out
  if (user) {
    const email = user.email ?? '';
    if (!ALLOWED_EMAILS.includes(email)) {
      const url = request.nextUrl.clone();
      url.pathname = '/access-denied';
      const response = NextResponse.redirect(url);
      // Clear auth cookies so they can't re-enter
      request.cookies.getAll().forEach((c) => {
        if (c.name.includes('auth-token') || c.name.startsWith('sb-')) {
          response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
        }
      });
      return response;
    }
  }

  // Redirect authenticated (allowed) users away from auth routes
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/radar';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
