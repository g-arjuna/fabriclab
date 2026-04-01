"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthControls } from "@/components/auth/AuthControls";

const NAV_LINKS = [
  { href: "/curriculum", label: "Curriculum" },
  { href: "/lab", label: "Labs" },
  { href: "/community", label: "Community" },
];

type PublicTopNavProps = {
  ctaHref?: string;
  ctaLabel?: string;
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function PublicTopNav({
  ctaHref = "/learn/ch0-hardware-foundations",
  ctaLabel = "Start learning",
}: PublicTopNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/78 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="font-mono text-sm uppercase tracking-[0.32em] text-cyan-400">
              FABRICLAB
            </span>
            <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.26em] text-cyan-200 sm:inline-flex">
              Open beta
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 p-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-white/8 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
            <AuthControls compact />
            <Link
              href={ctaHref}
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {ctaLabel}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white lg:hidden"
            aria-expanded={isOpen}
            aria-controls="public-mobile-menu"
          >
            <span>Menu</span>
            <MenuIcon open={isOpen} />
          </button>
        </div>

        {isOpen ? (
          <div
            id="public-mobile-menu"
            className="border-t border-white/8 pb-5 pt-4 lg:hidden"
          >
            <div className="grid gap-3">
              <div className="grid gap-2">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <AuthControls compact />
                  <Link
                    href={ctaHref}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {ctaLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
