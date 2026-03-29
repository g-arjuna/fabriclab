import Link from "next/link";

import { PublicCommunityLinks } from "@/components/community/PublicCommunityLinks";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#020617]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 text-xs text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono uppercase tracking-[0.28em] text-cyan-400">FABRICLAB</span>
            <span>{"\u00A9"} 2026</span>
          </div>
          <p className="max-w-xl text-xs leading-6 text-slate-500">
            Open curriculum, stateful labs, and a community feedback loop for AI and HPC networking.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <Link href="/" className="transition hover:text-slate-400">
              Home
            </Link>
            <Link href="/curriculum" className="transition hover:text-slate-400">
              Curriculum
            </Link>
            <Link href="/lab" className="transition hover:text-slate-400">
              Labs
            </Link>
            <Link href="/community" className="transition hover:text-slate-400">
              Community
            </Link>
          </div>
          <PublicCommunityLinks compact />
        </div>
      </div>
    </footer>
  );
}
