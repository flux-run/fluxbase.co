import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { mode, email, password, name, redirect: redirectTo } =
    await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://api.fluxbase.co";

  try {
    if (mode === "register") {
      const regRes = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: (err as { error?: string }).error || "Registration failed" },
          { status: regRes.status },
        );
      }
    }

    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      const err = await loginRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: string }).error || "Login failed" },
        { status: loginRes.status },
      );
    }

    const { token, org_id } = await loginRes.json();

    const cookieStore = await cookies();
    cookieStore.set("flux_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    if (org_id) {
      cookieStore.set("org_id", org_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    const finalRedirect =
      typeof redirectTo === "string" && redirectTo.startsWith("/")
        ? redirectTo
        : "/dashboard";
    return NextResponse.json({ ok: true, redirect: finalRedirect });
  } catch (err) {
    console.error("[auth/email] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
