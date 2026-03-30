type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
  appUrl: string;
};

type AdminSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string;
  adminEmails: string[];
};

function normaliseAppUrl(value: string | undefined): string {
  const fallback = "http://localhost:3000";
  
  // Try provided value, then Vercel production URL, then Vercel preview URL
  const raw = value?.trim() 
    || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

  if (!raw) {
    return fallback;
  }

  const url = raw.replace(/\/+$/, "");
  return url.startsWith("http") ? url : `https://${url}`;
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    appUrl: normaliseAppUrl(process.env.NEXT_PUBLIC_APP_URL),
  };
}

export function getAdminSupabaseEnv(): AdminSupabaseEnv | null {
  const publicEnv = getPublicSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!publicEnv || !serviceRoleKey) {
    return null;
  }

  return {
    ...publicEnv,
    serviceRoleKey,
    adminEmails: (process.env.SUPABASE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  };
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseEnv() !== null;
}

export function isSupabaseAdminConfigured(): boolean {
  return getAdminSupabaseEnv() !== null;
}
