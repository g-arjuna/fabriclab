import { NextResponse } from "next/server";

import { requireAdminViewer } from "@/lib/auth/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

async function findUserIdByEmail(email: string) {
  const admin = getAdminSupabaseClient();
  if (!admin) {
    return { error: "Supabase admin client is not configured." };
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return { error: error.message };
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return { userId: match.id };
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return { error: "No Supabase Auth user found for that email." };
}

async function readEmail(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  return email;
}

export async function POST(request: Request) {
  try {
    await requireAdminViewer();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = await readEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const lookup = await findUserIdByEmail(email);
  if (!lookup.userId) {
    return NextResponse.json({ error: lookup.error ?? "User lookup failed." }, { status: 404 });
  }

  const { error } = await adminDb.from("user_entitlements").upsert(
    {
      user_id: lookup.userId,
      entitlement_key: "core_paid",
      source: "manual",
    },
    {
      onConflict: "user_id,entitlement_key",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Granted legacy test access to ${email}.` });
}

export async function DELETE(request: Request) {
  try {
    await requireAdminViewer();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = await readEmail(request);
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }
  const adminDb = admin as any;

  const lookup = await findUserIdByEmail(email);
  if (!lookup.userId) {
    return NextResponse.json({ error: lookup.error ?? "User lookup failed." }, { status: 404 });
  }

  const { error } = await adminDb
    .from("user_entitlements")
    .delete()
    .eq("user_id", lookup.userId)
    .eq("entitlement_key", "core_paid");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Revoked legacy test access from ${email}.` });
}
