import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname
  const isPublic = path === '/login' || path.startsWith('/apply')

  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      // Without Supabase env, only allow public paths
      if (!isPublic) return NextResponse.redirect(new URL('/login', req.url))
      return res
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
          })
        },
      },
    })

    const sessionRes = await supabase.auth.getSession()
    const session = sessionRes?.data?.session ?? null

    if (!session && !isPublic) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (session && path === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  } catch (ex) {
    console.error('[middleware]', ex)
    // On any error, allow public paths and redirect non-public to login
    if (!isPublic) return NextResponse.redirect(new URL('/login', req.url))
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
