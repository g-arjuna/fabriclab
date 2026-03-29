import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createOAuthState, getOAuthAuthorizationUrl, type OAuthProvider } from "@/lib/auth/oauth";

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL("/login?error=provider", request.url));
  }

  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/curriculum";
  const state = createOAuthState();
  const authUrl = getOAuthAuthorizationUrl(provider, state);
  if (!authUrl) {
    return NextResponse.redirect(new URL("/login?error=oauth_config", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(`fabriclab_oauth_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("fabriclab_auth_next", nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}
