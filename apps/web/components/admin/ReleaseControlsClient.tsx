"use client";

import { useMemo, useState } from "react";

type AdminCatalogItem = {
  kind: "chapter" | "lab";
  slug: string;
  title: string;
  href: string;
  number: number;
  partTitle?: string;
  durationLabel: string;
  accessTier: "free" | "paid";
  isPublished: boolean;
  previewEnabled: boolean;
  previewSummary: string;
  description: string;
};

type ReleaseControlsClientProps = {
  initialItems: AdminCatalogItem[];
};

export function ReleaseControlsClient({ initialItems }: ReleaseControlsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entitlementEmail, setEntitlementEmail] = useState("");
  const [entitlementPending, setEntitlementPending] = useState<"grant" | "revoke" | null>(null);

  const grouped = useMemo(
    () => ({
      chapters: items.filter((item) => item.kind === "chapter"),
      labs: items.filter((item) => item.kind === "lab"),
    }),
    [items],
  );

  async function saveItem(item: AdminCatalogItem) {
    setSavingSlug(item.slug);
    setMessage(null);

    const response = await fetch("/api/admin/catalog", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: item.kind,
        slug: item.slug,
        patch: {
          isPublished: item.isPublished,
          accessTier: item.accessTier,
          previewEnabled: item.previewEnabled,
          previewSummary: item.previewSummary,
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingSlug(null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Failed to save release state.");
      return;
    }

    setMessage(`Saved ${item.title}.`);
  }

  async function updateEntitlement(mode: "grant" | "revoke") {
    if (!entitlementEmail.trim()) {
      setMessage("Enter an email address first.");
      return;
    }

    setEntitlementPending(mode);
    setMessage(null);

    const response = await fetch("/api/admin/entitlements", {
      method: mode === "grant" ? "POST" : "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: entitlementEmail.trim() }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    setEntitlementPending(null);
    setMessage(payload?.message ?? payload?.error ?? "Entitlement update completed.");
  }

  function updateItem(slug: string, patch: Partial<AdminCatalogItem>) {
    setItems((current) =>
      current.map((item) => (item.slug === slug ? { ...item, ...patch } : item)),
    );
  }

  function renderCard(item: AdminCatalogItem) {
    const isSaving = savingSlug === item.slug;

    return (
      <div key={item.slug} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {item.kind} {item.number}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{item.durationLabel}</p>
            {item.partTitle ? (
              <p className="mt-1 text-xs text-slate-500">{item.partTitle}</p>
            ) : null}
          </div>
          <a
            href={item.href}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Open route
          </a>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-400">{item.description}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Published</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => updateItem(item.slug, { isPublished: true })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  item.isPublished
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => updateItem(item.slug, { isPublished: false })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  !item.isPublished
                    ? "bg-amber-300 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Hidden
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Access tier</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => updateItem(item.slug, { accessTier: "free" })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  item.accessTier === "free"
                    ? "bg-emerald-400 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => updateItem(item.slug, { accessTier: "paid" })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  item.accessTier === "paid"
                    ? "bg-amber-300 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#020b16] p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview page</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => updateItem(item.slug, { previewEnabled: true })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  item.previewEnabled
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Enabled
              </button>
              <button
                type="button"
                onClick={() => updateItem(item.slug, { previewEnabled: false })}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  !item.previewEnabled
                    ? "bg-slate-200 text-slate-950"
                    : "border border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                Disabled
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-[#020b16] p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview summary</p>
          <textarea
            value={item.previewSummary}
            onChange={(event) => updateItem(item.slug, { previewSummary: event.target.value })}
            rows={4}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Route: <code className="rounded bg-slate-950 px-1.5 py-0.5 text-cyan-300">{item.href}</code>
          </div>
          <button
            type="button"
            onClick={() => void saveItem(item)}
            disabled={isSaving}
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Manual entitlement</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Grant or revoke paid access</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Use an email address from Supabase Auth. This adds or removes the `core_paid` entitlement
          without changing billing state.
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="email"
            value={entitlementEmail}
            onChange={(event) => setEntitlementEmail(event.target.value)}
            placeholder="learner@fabriclab.dev"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
          />
          <button
            type="button"
            onClick={() => void updateEntitlement("grant")}
            disabled={entitlementPending !== null}
            className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {entitlementPending === "grant" ? "Granting..." : "Grant paid access"}
          </button>
          <button
            type="button"
            onClick={() => void updateEntitlement("revoke")}
            disabled={entitlementPending !== null}
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {entitlementPending === "revoke" ? "Revoking..." : "Revoke"}
          </button>
        </div>
        {message ? (
          <div className="mt-4 rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Chapters</p>
        </div>
        <div className="space-y-5">{grouped.chapters.map(renderCard)}</div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Labs</p>
        </div>
        <div className="space-y-5">{grouped.labs.map(renderCard)}</div>
      </section>
    </div>
  );
}
