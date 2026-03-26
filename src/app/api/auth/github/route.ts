import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=MissingCode", request.url));
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.fluxbase.co";
    console.log(`[Auth] Exchanging code with backend at ${apiUrl}/auth/github`);

    const res = await fetch(`${apiUrl}/auth/github?code=${code}`);
    
    if (!res.ok) {
      const error = await res.text();
      console.error(`[Auth] Backend exchange failed: ${error}`);
      return NextResponse.redirect(new URL("/login?error=BackendExchangeFailed", request.url));
    }

    const { token, org_id } = await res.json();

    // Set secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("flux_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    if (org_id) {
      cookieStore.set("org_id", org_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("[Auth] Callback exception:", err);
    return NextResponse.redirect(new URL("/login?error=InternalError", request.url));
  }
}
