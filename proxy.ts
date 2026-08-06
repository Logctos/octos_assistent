import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isMarketingPage = pathname === "/";
  const isCronRoute = pathname.startsWith("/api/cron");
  const isApiRoute = pathname.startsWith("/api/");

  // Supabase's auth cookies always look like `sb-<project-ref>-auth-token[.N]`.
  // Skip the network round trip to Supabase entirely when there's no such
  // cookie, since getUser() would just resolve to no user anyway — this is
  // the common case for anonymous visitors hitting "/" or "/login".
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

  let user = null;

  if (hasAuthCookie && !isCronRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  if (!user && !isLoginPage && !isMarketingPage && !isCronRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isLoginPage || isMarketingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
