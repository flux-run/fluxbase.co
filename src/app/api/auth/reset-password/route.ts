import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json().catch(() => ({}));
  if (!token || !password) {
    return NextResponse.json(
      { error: "token and password are required" },
      { status: 400 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.fluxbase.co";

  try {
    const res = await fetch(`${apiUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Reset failed" },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
