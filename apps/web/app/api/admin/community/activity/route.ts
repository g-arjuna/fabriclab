import { NextResponse } from "next/server";

import { requireAdminViewer } from "@/lib/auth/server";
import {
  clearCommunityActivityReviewed,
  COMMUNITY_ACTIVITY_TYPES,
  hideCommunityActivity,
  isMissingCommunityActivityReviewsTable,
  markCommunityActivityReviewed,
  type CommunityActivityType,
} from "@/lib/community/admin";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";

const ACTIONS = ["review", "unreview", "hide"] as const;

type ActivityAction = (typeof ACTIONS)[number];

function parseActivityAction(value: FormDataEntryValue | null): ActivityAction | null {
  if (typeof value !== "string") {
    return null;
  }

  return ACTIONS.find((entry) => entry === value) ?? null;
}

function parseActivityType(value: FormDataEntryValue | null): CommunityActivityType | null {
  if (typeof value !== "string") {
    return null;
  }

  return COMMUNITY_ACTIVITY_TYPES.find((entry) => entry === value) ?? null;
}

function buildRedirectUrl(request: Request, redirectTo: string | null, params?: Record<string, string>) {
  const url = new URL(
    redirectTo && redirectTo.startsWith("/admin/community") ? redirectTo : "/admin/community",
    request.url,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function POST(request: Request) {
  const viewer = await requireAdminViewer().catch(() => null);
  if (!viewer?.user) {
    return NextResponse.redirect(buildRedirectUrl(request, "/account"), { status: 303 });
  }

  const admin = getAdminSupabaseClient();
  if (!admin) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/admin/community", { error: "config" }),
      { status: 303 },
    );
  }

  const formData = await request.formData();
  const action = parseActivityAction(formData.get("action"));
  const activityType = parseActivityType(formData.get("activityType"));
  const activityId = formData.get("activityId")?.toString().trim() ?? "";
  const redirectTo = formData.get("redirectTo")?.toString() ?? "/admin/community";

  if (!action || !activityType || !activityId) {
    return NextResponse.redirect(
      buildRedirectUrl(request, redirectTo, { error: "invalid" }),
      { status: 303 },
    );
  }

  try {
    if (action === "review") {
      await markCommunityActivityReviewed(admin as any, {
        activityType,
        activityId,
        reviewerUserId: viewer.user.id,
        reviewerName: viewer.user.user_metadata?.full_name?.toString() ?? viewer.email ?? null,
      });
    } else if (action === "unreview") {
      await clearCommunityActivityReviewed(admin as any, {
        activityType,
        activityId,
      });
    } else {
      await hideCommunityActivity(admin as any, {
        activityType,
        activityId,
      });
    }
  } catch (error) {
    if (isMissingCommunityActivityReviewsTable(error as { code?: string; message?: string })) {
      return NextResponse.redirect(
        buildRedirectUrl(request, redirectTo, { error: "reviews_setup" }),
        { status: 303 },
      );
    }

    return NextResponse.redirect(
      buildRedirectUrl(request, redirectTo, { error: "action_failed" }),
      { status: 303 },
    );
  }

  return NextResponse.redirect(buildRedirectUrl(request, redirectTo), { status: 303 });
}
