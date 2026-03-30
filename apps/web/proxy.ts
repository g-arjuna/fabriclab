import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getAuthEntryHosts(): string[] {
  return (process.env.AUTH_ENTRY_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function normaliseHost(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function getCanonicalAppUrl(): URL | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const authEntryHosts = getAuthEntryHosts();
  const requestHost = normaliseHost(request.headers.get("host"));
  const canonicalAppUrl = getCanonicalAppUrl();

  if (
    authEntryHosts.length > 0 &&
    requestHost &&
    authEntryHosts.includes(requestHost) &&
    canonicalAppUrl &&
    requestHost !== normaliseHost(canonicalAppUrl.host)
  ) {
    const target = new URL("/login", canonicalAppUrl);
    const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    if (currentPath && currentPath !== "/") {
      target.searchParams.set("next", currentPath);
    }

    return NextResponse.redirect(target, { status: 307 });
  }

  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
