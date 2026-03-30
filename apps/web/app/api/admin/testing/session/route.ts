import { timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { createSessionCookie, getSessionCookieName } from "@/lib/auth/session";
import { getAdminSupabaseEnv } from "@/lib/supabase/env";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

type SmokeSessionBody = {
  email?: string;
  ensurePaid?: boolean;
};

function isAuthorizedToken(provided: string | null) {
  const expected = process.env.SMOKE_TEST_AUTH_TOKEN?.trim();
  if (!expected || !provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function isAllowedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const adminEmails = getAdminSupabaseEnv()?.adminEmails ?? [];
  return adminEmails.includes(normalized) || normalized.endsWith("@fabriclab.dev");
}

async function ensureUser(email: string) {
  const admin = getAdminSupabaseClient();
  if (!admin) {
    throw new Error("Supabase admin is not configured.");
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(error.message);
  }

  const existing = data?.users.find((entry) => entry.email?.toLowerCase() === email);
  if (existing) {
    return existing;
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createError || !createdUser.user) {
    throw new Error(createError?.message ?? `Failed to create auth user for ${email}`);
  }

  return createdUser.user;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const tokenFromCustomHeader = request.headers.get("x-fabriclab-smoke-token");
  const token = tokenFromCustomHeader ?? tokenFromHeader;

  if (!isAuthorizedToken(token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as SmokeSessionBody | null;
  const email = payload?.email?.trim().toLowerCase();
  const ensurePaid = payload?.ensurePaid !== false;

  if (!email || !isAllowedEmail(email)) {
    return NextResponse.json(
      {
        error: "A valid smoke-test email is required. Use an admin email or an address under @fabriclab.dev.",
      },
      { status: 400 },
    );
  }

  const user = await ensureUser(email);
  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  await adminDb.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      display_name:
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        null,
      is_admin: (getAdminSupabaseEnv()?.adminEmails ?? []).includes(email),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    },
  );

  if (ensurePaid) {
    await adminDb.from("user_entitlements").upsert(
      {
        user_id: user.id,
        entitlement_key: "core_paid",
        source: "manual",
      },
      {
        onConflict: "user_id,entitlement_key",
        ignoreDuplicates: false,
      },
    );
  }

  const session = await createSessionCookie({
    id: user.id,
    email,
    user_metadata: {
      full_name:
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) || null,
      name: (typeof user.user_metadata?.name === "string" && user.user_metadata.name) || null,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Could not mint a FabricLab session." }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    email,
    userId: user.id,
    ensurePaid,
  });

  response.cookies.set({
    name: getSessionCookieName(),
    value: session,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
