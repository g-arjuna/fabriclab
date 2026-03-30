import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { getAuthSessionSecret } from "@/lib/auth/env";
import type { ViewerUser } from "@/lib/auth/types";

const SESSION_COOKIE_NAME = "fabriclab_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  user: ViewerUser;
  exp: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function createSessionCookie(user: ViewerUser): Promise<string | null> {
  const secret = getAuthSessionSecret();
  if (!secret) {
    return null;
  }

  const payload: SessionPayload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function readSessionUserFromCookies(): Promise<ViewerUser | null> {
  const secret = getAuthSessionSecret();
  if (!secret) {
    return null;
  }

  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }

  const [payloadPart, signaturePart] = raw.split(".");
  if (!payloadPart || !signaturePart || !verifySignature(payloadPart, signaturePart, secret)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart)) as SessionPayload;
    if (!payload.user?.id || !payload.user?.email) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.user;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

