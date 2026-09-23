import { NextRequest, NextResponse } from "next/server";
import { COOKIE, verifyAdminToken } from "@/lib/auth";
import { resolveCanonicalHost, sameRegistrableHost, stripHostPort } from "@/lib/site-origin";

function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const canonical = resolveCanonicalHost();
  if (!canonical) return null;
  if (canonical.includes("vercel.app") || canonical === "localhost") return null;

  const incoming = stripHostPort(request.headers.get("host") || "");
  if (!incoming || incoming === canonical) return null;
  if (incoming.includes("vercel.app") || incoming === "localhost") return null;
  // Only rewrite www ↔ apex for the same site; never force unrelated hosts.
  if (!sameRegistrableHost(incoming, canonical)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = canonical;
  url.port = "";
  return NextResponse.redirect(url, 301);
}

export async function middleware(request: NextRequest) {
  const hostFix = canonicalHostRedirect(request);
  if (hostFix) return hostFix;

  const { pathname } = request.nextUrl;
  const needsAuth = pathname.startsWith("/admin") || pathname === "/write" || pathname.startsWith("/write/");
  if (!needsAuth) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  const ok = token ? await verifyAdminToken(token) : false;
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Host canonicalization must run on public pages (posts, sitemap consumers).
     * Skip Next internals and common static asset extensions.
     */
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|xml|js|css|map|woff2?)$).*)",
  ],
};
