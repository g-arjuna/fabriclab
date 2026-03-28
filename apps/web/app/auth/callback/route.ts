import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const env = getPublicSupabaseEnv();
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("next") ?? "/curriculum";

  if (!env) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = url.searchParams.get("code");
  if (!code) {
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

  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

