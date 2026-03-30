import { NextResponse } from "next/server";

import { readSessionUserFromCookies } from "@/lib/auth/session";

export async function GET() {
  const user = await readSessionUserFromCookies();
  return NextResponse.json({
    user,
    authenticated: !!user,
  });
}

