import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";

type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const emailOtpTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && emailOtpTypes.has(value as EmailOtpType);
}

export async function GET(request: Request) {
  const env = getPublicSupabaseEnv();
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("next") ?? "/curriculum";

  if (!env) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/login", request.url));
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
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && isEmailOtpType(otpType)) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
  } else {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
