import { NextResponse, type NextRequest } from "next/server";
import { sha256Hex } from "@/lib/hash";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

const ADMIN_PATHS = ["/attendance", "/students", "/requests", "/admin-calendar", "/materials", "/dashboard"];

// Cloudflare Workers(OpenNext)環境では、middleware内で@supabase/ssrのcreateServerClientを
// フルに使うと動作が不安定になることが報告されているため、middlewareではCookieの有無だけを
// 軽量にチェックする(なりすまし防止の実際の検証は各ページ側のcreateAnonClient()に任せる。
// 不正/期限切れのCookieだった場合はページ側でuserがnullになりログイン画面に戻される)。
function hasSupabaseSessionCookie(request: NextRequest): boolean {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const prefix = `sb-${projectRef}-auth-token`;
  return request.cookies.getAll().some((c) => c.name.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/my")) {
    if (!hasSupabaseSessionCookie(request)) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/attendance/:path*",
    "/students/:path*",
    "/requests/:path*",
    "/admin-calendar/:path*",
    "/materials/:path*",
    "/dashboard/:path*",
    "/my/:path*",
  ],
};
