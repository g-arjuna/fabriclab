import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/curriculum";
  return NextResponse.redirect(new URL(nextPath, request.url));
}
