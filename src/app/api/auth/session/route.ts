import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "flux-super-secret-key";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("flux_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Match the shape of the NextAuth session for compatibility
    return NextResponse.json({
      user: {
        id: payload.user_id,
        email: payload.email, // We might need to encode email in JWT if needed
      },
      flux_token: token,
      org_id: payload.org_id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
