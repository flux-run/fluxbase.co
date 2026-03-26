import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("flux_token");
  cookieStore.delete("org_id");

  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "https://dev.fluxbase.co"));
}
