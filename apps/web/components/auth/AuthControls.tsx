"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

type AuthControlsProps = {
  compact?: boolean;
};

export function AuthControls({ compact = false }: AuthControlsProps) {
  const router = useRouter();
  const { enabled, loading, user, signOut } = useAuth();

  if (!enabled) {
    return (
      <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
        Local mode
      </span>
    );
  }

  if (loading) {
    return (
      <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
        Checking session...
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      <Link
        href="/account"
        className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        {compact ? "Account" : user.email ?? "Account"}
      </Link>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.refresh();
        }}
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
