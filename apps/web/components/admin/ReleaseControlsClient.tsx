"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const itemsRef = useRef(initialItems);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entitlementEmail, setEntitlementEmail] = useState("");
  const [entitlementPending, setEntitlementPending] = useState<"grant" | "revoke" | null>(null);
  const [notificationTestEmail, setNotificationTestEmail] = useState("");
  const [notificationTestPending, setNotificationTestPending] = useState(false);
  const [notificationTestResult, setNotificationTestResult] = useState<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const grouped = useMemo(
    () => ({
      chapters: items.filter((item) => item.kind === "chapter"),
      labs: items.filter((item) => item.kind === "lab"),
    }),
    [items],
  );

  async function saveItem(slug: string) {
    const item = itemsRef.current.find((entry) => entry.slug === slug);
    if (!item) {
      setMessage("Could not find the selected catalog item.");
      return;
    }

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

  async function sendNotificationTest() {
    setNotificationTestPending(true);
    setNotificationTestResult(null);

    const response = await fetch("/api/admin/notifications/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: notificationTestEmail.trim() || undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          configured?: boolean;
          to?: string;
          subject?: string;
          ok?: boolean;
          status?: number | null;
          reason?: string;
          message?: string;
        }
      | null;

    setNotificationTestPending(false);

    if (!response.ok) {
      setNotificationTestResult(payload?.error ?? "Notification test failed.");
      return;
    }

    const lines = [
      `Configured: ${payload?.configured ? "yes" : "no"}`,
      payload?.to ? `To: ${payload.to}` : null,
      payload?.subject ? `Subject: ${payload.subject}` : null,
      payload?.reason ? `Reason: ${payload.reason}` : null,
      payload?.status != null ? `HTTP status: ${payload.status}` : null,
      payload?.message ? `Provider response: ${payload.message}` : null,
      payload?.ok ? "Result: success" : "Result: failed",
    ].filter(Boolean);

    setNotificationTestResult(lines.join("\n"));
  }

  function updateItem(slug: string, patch: Partial<AdminCatalogItem>) {
    const nextItems = itemsRef.current.map((item) =>
      item.slug === slug ? { ...item, ...patch } : item,
    );
    itemsRef.current = nextItems;
    setItems(nextItems);
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
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Access metadata</p>
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
                Open
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
                Legacy test
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Published items stay visible in the public catalog, but signed-in access controls now
              decide whether learners can open the full chapter or lab experience.
            </p>
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
            onClick={() => void saveItem(item.slug)}
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
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Internal entitlement testing</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Grant or revoke legacy test access</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Use an email address from Supabase Auth. This adds or removes the dormant legacy
          entitlement row for internal regression testing. The public app no longer depends on it
          for normal access.
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
            {entitlementPending === "grant" ? "Granting..." : "Grant test access"}
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

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Notification testing</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Send a Mailgun test email</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Trigger the production notification path directly and inspect the exact provider response.
          Leave the address blank to send to your signed-in admin email.
        </p>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="email"
            value={notificationTestEmail}
            onChange={(event) => setNotificationTestEmail(event.target.value)}
            placeholder="admin@fabriclab.dev"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/40"
          />
          <button
            type="button"
            onClick={() => void sendNotificationTest()}
            disabled={notificationTestPending}
            className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {notificationTestPending ? "Sending..." : "Send test email"}
          </button>
        </div>
        {notificationTestResult ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/8 bg-[#020b16] px-4 py-3 text-sm text-slate-300">
            {notificationTestResult}
          </pre>
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
