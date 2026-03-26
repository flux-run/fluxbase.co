import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("flux_token");
  
  // Protected routes
  const isProtected = ["/project", "/dashboard"].some(p => request.nextUrl.pathname.startsWith(p));
  
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/project/:path*", "/dashboard"],
};
