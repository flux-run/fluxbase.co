import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}));
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.fluxbase.co";

  try {
    const res = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Request failed" },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
