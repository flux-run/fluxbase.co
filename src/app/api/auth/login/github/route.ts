import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const origin = request.headers.get("origin") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${origin}`;
  
  const redirectUri = `${baseUrl}/api/auth/github`;

  if (!clientId) {
    console.error("[Auth] GITHUB_CLIENT_ID is not set in environment variables");
    return NextResponse.redirect(new URL("/login?error=ConfigurationError", request.url));
  }

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${redirectUri}`;
  
  return NextResponse.redirect(githubUrl);
}
