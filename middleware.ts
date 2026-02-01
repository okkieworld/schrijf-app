import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // Voeg 'any' toe als de build faalt op types
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  // Als de gebruiker NIET is ingelogd en NIET op de login-pagina is
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// Hier geef je aan op welke paden de middleware moet draaien
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}