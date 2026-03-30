type OAuthProvider = "google" | "github";

type OAuthProviderConfig = {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
};

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return null;
    }

    return {
      provider,
      clientId,
      clientSecret,
    };
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    provider,
    clientId,
    clientSecret,
  };
}

export function getEnabledOAuthProviders(): OAuthProvider[] {
  const raw = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").trim().toLowerCase();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is OAuthProvider => value === "google" || value === "github");
}

export function getOAuthProviderConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  return getProviderConfig(provider);
}

export function getAuthSessionSecret(): string | null {
  return process.env.AUTH_SESSION_SECRET?.trim() ?? null;
}

export function getAuthAppUrl(): string {
  return getAppUrl();
}
