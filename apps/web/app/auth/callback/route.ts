import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("next") ?? "/curriculum";

  return NextResponse.redirect(
    new URL(`/login?error=legacy_auth_path_disabled&next=${encodeURIComponent(redirectTo)}`, request.url),
  );
}
