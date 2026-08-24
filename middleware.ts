import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sha256Hex } from "@/lib/hash";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

const ADMIN_PATHS = ["/attendance", "/students", "/requests", "/admin-calendar", "/materials"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  // 生徒ログイン用セッションの確認(Supabase Auth)。環境変数未設定時はスキップ。
  let studentUserId: string | null = null;
  if (supabaseUrl && publishableKey) {
    const supabase = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    studentUserId = user?.id ?? null;
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/my")) {
    if (!studentUserId) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const expected = process.env.ADMIN_PASSWORD
      ? await sha256Hex(process.env.ADMIN_PASSWORD)
      : null;
    if (!expected || token !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/attendance/:path*",
    "/students/:path*",
    "/requests/:path*",
    "/admin-calendar/:path*",
    "/materials/:path*",
    "/my/:path*",
  ],
};
