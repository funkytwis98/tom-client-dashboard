import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { OPERATOR_ONLY_ROUTES, PRODUCT_GATED_ROUTES } from '@/lib/route-guard'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/signup')
    || request.nextUrl.pathname.startsWith('/sites')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/signup')

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Route guard: block client_owner from operator-only and product-gated routes
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, client_id')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role ?? 'admin'

    if (role === 'client_owner') {
      const pathname = request.nextUrl.pathname

      // Block operator-only routes
      for (const route of OPERATOR_ONLY_ROUTES) {
        if (pathname === route || pathname.startsWith(route + '/')) {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
      }

      // Block product-gated routes based on products_enabled
      const clientId = profile?.client_id
      if (clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('products_enabled')
          .eq('id', clientId)
          .single()

        const productsEnabled = new Set(
          (client?.products_enabled as string[] | null) ?? ['receptionist']
        )

        for (const [route, requiredProducts] of Object.entries(PRODUCT_GATED_ROUTES)) {
          if (pathname === route || pathname.startsWith(route + '/')) {
            const hasAccess = requiredProducts.some((p) => productsEnabled.has(p))
            if (!hasAccess) {
              const url = request.nextUrl.clone()
              url.pathname = '/'
              return NextResponse.redirect(url)
            }
          }
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
