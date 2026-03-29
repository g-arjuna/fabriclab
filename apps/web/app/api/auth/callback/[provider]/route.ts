import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveSupabaseUserIdByEmail } from "@/lib/auth/identity";
import { exchangeCodeForIdentity, type OAuthProvider } from "@/lib/auth/oauth";
import { createSessionCookie, getSessionCookieName } from "@/lib/auth/session";

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL("/login?error=provider", request.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`fabriclab_oauth_state_${provider}`)?.value;
  const nextPath = cookieStore.get("fabriclab_auth_next")?.value ?? "/curriculum";
  cookieStore.delete(`fabriclab_oauth_state_${provider}`);
  cookieStore.delete("fabriclab_auth_next");
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url));
  }

  const identity = await exchangeCodeForIdentity(provider, code);
  if (!identity?.email) {
    return NextResponse.redirect(new URL("/login?error=identity", request.url));
  }

  const supabaseUserId = await resolveSupabaseUserIdByEmail(identity.email, identity.name);
  if (!supabaseUserId) {
    return NextResponse.redirect(new URL("/login?error=profile", request.url));
  }

  const sessionValue = await createSessionCookie({
    id: supabaseUserId,
    email: identity.email,
    user_metadata: {
      full_name: identity.name ?? null,
      name: identity.name ?? null,
    },
  });

  if (!sessionValue) {
    return NextResponse.redirect(new URL("/login?error=session", request.url));
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set(getSessionCookieName(), sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
