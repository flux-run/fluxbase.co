import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const host = request.headers.get("host") || "fluxbase.co";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  
  const redirectUri = `${baseUrl}/api/auth/google`;

  if (!clientId) {
    console.error("[Auth] GOOGLE_CLIENT_ID is not set in environment variables");
    return NextResponse.redirect(new URL("/login?error=ConfigurationError", request.url));
  }

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
  
  return NextResponse.redirect(googleUrl);
}
