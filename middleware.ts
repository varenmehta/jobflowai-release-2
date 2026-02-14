import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

const protectedPaths = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/pipeline",
  "/analytics",
  "/jobs",
  "/resumes",
  "/partners",
  "/services",
  "/admin",
  "/company",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Keep local auth flow on one origin to avoid OAuth PKCE cookie mismatches.
  if (host.startsWith("127.0.0.1:")) {
    const url = request.nextUrl.clone();
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (isDemoMode()) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const session = await auth();
  if (!session?.user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/profile/:path*", "/onboarding/:path*", "/pipeline/:path*", "/analytics/:path*", "/jobs/:path*", "/resumes/:path*", "/partners/:path*", "/services/:path*", "/admin/:path*", "/company/:path*"],
};
