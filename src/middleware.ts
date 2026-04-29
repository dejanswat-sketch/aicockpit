import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

const ALLOWED_EMAILS = ['dejanwarrior@gmail.com', 'dejanswat@gmail.com'];
const PROTECTED_ROUTES = ['/radar', '/ai-brain', '/vault', '/laboratorija', '/submissions'];
const AUTH_ROUTES = ['/login', '/register'];
const PUBLIC_ROUTES = ['/access-denied', '/auth/callback', '/update-password'];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
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

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Allow public routes through without any checks
  if (isPublic) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Email allowlist check — signed-in users not on the list get kicked out
  if (user) {
    const email = user.email ?? '';
    if (!ALLOWED_EMAILS.includes(email)) {
      // Sign them out by clearing the session cookie, then redirect
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
  if (user && isAuthRoute) {
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
