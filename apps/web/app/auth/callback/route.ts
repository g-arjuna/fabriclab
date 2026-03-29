import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resolveSupabaseUserIdByEmail } from "@/lib/auth/identity";
import { createSessionCookie, getSessionCookieName } from "@/lib/auth/session";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const emailOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && emailOtpTypes.has(value as EmailOtpType);
}

export async function GET(request: Request) {
  const env = getPublicSupabaseEnv();
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("next") ?? "/curriculum";

  if (!env) {
    return NextResponse.redirect(new URL("/login?error=supabase_config", request.url));
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL(`/login?error=callback&next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=code_exchange&next=${encodeURIComponent(redirectTo)}`, request.url),
      );
    }
  } else if (tokenHash && isEmailOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=magic_link&next=${encodeURIComponent(redirectTo)}`, request.url),
      );
    }
  } else {
    return NextResponse.redirect(new URL(`/login?error=callback&next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return NextResponse.redirect(new URL(`/login?error=user&next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  const userId = await resolveSupabaseUserIdByEmail(
    email,
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
      null,
  );

  if (!userId) {
    return NextResponse.redirect(new URL(`/login?error=profile&next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  const sessionValue = await createSessionCookie({
    id: userId,
    email,
    user_metadata: {
      full_name:
        (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) || null,
      name: (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) || null,
    },
  });

  if (!sessionValue) {
    return NextResponse.redirect(new URL(`/login?error=session&next=${encodeURIComponent(redirectTo)}`, request.url));
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(getSessionCookieName(), sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
