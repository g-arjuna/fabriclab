import { randomBytes } from "crypto";

import { getAuthAppUrl, getOAuthProviderConfig } from "@/lib/auth/env";

export type OAuthProvider = "google" | "github";

type OAuthIdentity = {
  email: string;
  name?: string | null;
};

function getRedirectUri(provider: OAuthProvider): string {
  return `${getAuthAppUrl()}/api/auth/callback/${provider}`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function getOAuthAuthorizationUrl(provider: OAuthProvider, state: string): string | null {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    return null;
  }

  const redirectUri = getRedirectUri(provider);
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
      access_type: "offline",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForIdentity(
  provider: OAuthProvider,
  code: string,
): Promise<OAuthIdentity | null> {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    return null;
  }

  const redirectUri = getRedirectUri(provider);
  if (provider === "google") {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      return null;
    }

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      return null;
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) {
      return null;
    }

    const profile = await profileResponse.json();
    if (!profile.email) {
      return null;
    }

    return { email: String(profile.email).toLowerCase(), name: profile.name ?? null };
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokens = await tokenResponse.json();
  if (!tokens.access_token) {
    return null;
  }

  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }),
    fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }),
  ]);

  if (!userResponse.ok || !emailsResponse.ok) {
    return null;
  }

  const profile = await userResponse.json();
  const emails = (await emailsResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
  const primaryEmail = emails.find((entry) => entry.primary && entry.verified)?.email ?? profile.email ?? null;
  if (!primaryEmail) {
    return null;
  }

  return {
    email: String(primaryEmail).toLowerCase(),
    name: profile.name ?? profile.login ?? null,
  };
}

