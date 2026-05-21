import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth er midlertidigt deaktiveret.
// For at aktivere login: genindফ্ Supabase-klienten og fjern kommentarer nedenfor.
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
