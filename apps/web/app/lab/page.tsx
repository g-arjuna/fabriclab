import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LabExperience } from "@/app/module/rocev2/lab/LabExperience";
import { AuthRequiredContentShell } from "@/components/catalog/AuthRequiredContentShell";
import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { getServerViewer } from "@/lib/auth/server";
import { getCatalogAccessState, getCurriculumCatalog } from "@/lib/catalog/runtime";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const SUPPORTED_LAB_IDS = new Set([
  "lab0a-fabric-cli-orientation",
  "lab0b-roce-counter-reading",
  "lab0-failed-rail",
  "lab1-pfc-fix",
  "lab2-congestion",
  "lab3-uneven-spine",
  "lab4-topology-sizing",
  "lab5-nccl-diagnosis",
  "lab6-alert-triage",
  "lab7-pause-storm",
  "lab8-pfc-priority-mismatch",
  "lab9-errdisable-recovery",
  "lab10-ecmp-hotspot",
  "lab11-bgp-path-failure",
  "lab14-srv6-te-path-steering",
  "lab15-rdma-rkey-exposure",
  "lab16-spectrum-x-platform-audit",
  "lab17-roce-day-zero-config",
  "lab18-ecn-threshold-tuning",
  "lab19-adaptive-routing-imbalance",
]);

function LabLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 px-8 py-6 text-sm text-slate-300 shadow-2xl shadow-slate-950/40 backdrop-blur">
        Preparing lab environment...
      </div>
    </main>
  );
}

type LabPageProps = {
  searchParams: Promise<{ lab?: string }>;
};

export default async function LabPage({ searchParams }: LabPageProps) {
  const { lab: labId } = await searchParams;
  const viewer = await getServerViewer();

  if (!labId) {
    const authEnabled = isSupabaseConfigured();
    const hasSession = !!viewer.user || viewer.isAdmin;
    const { labs } = await getCurriculumCatalog(viewer);

    return (
      <main className="min-h-screen bg-[#020617] text-slate-100">
        <PublicTopNav ctaHref="/curriculum" ctaLabel="Open curriculum" />

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <header className="grid gap-6 lg:grid-cols-[1fr_0.78fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Labs</p>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                Pick a FabricLab scenario before entering the simulator
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
                Each lab opens as a dedicated simulator session. Browse the available scenarios
                first, then enter the one you want to work on. FabricLab labs are best experienced
                on desktop because they combine topology, multi-device CLI, and reference tooling in
                one workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
                <p className="text-2xl font-semibold text-white">{labs.length}</p>
                <p className="mt-2 text-sm text-slate-400">labs in the catalog</p>
              </div>
              <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
                <p className="text-2xl font-semibold text-cyan-200">Desktop</p>
                <p className="mt-2 text-sm text-cyan-100">recommended for simulator work</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
                <p className="text-2xl font-semibold text-white">{hasSession ? "Signed in" : "Guest"}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {hasSession ? "enter labs directly" : authEnabled ? "sign in required to enter" : "local mode"}
                </p>
              </div>
            </div>
          </header>

          <section className="mt-10 space-y-4">
            {labs.map((lab) => {
              const canEnter = !authEnabled || hasSession;
              const isSimulatorReady = SUPPORTED_LAB_IDS.has(lab.slug);
              const enterHref = `/lab?lab=${encodeURIComponent(lab.slug)}`;

              return (
                <article
                  key={lab.slug}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)] sm:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Lab {lab.numberLabel ?? lab.number}
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                          {lab.durationLabel}
                        </span>
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                          Desktop recommended
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-semibold text-white">{lab.title}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                        {lab.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {lab.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[220px]">
                      {canEnter ? (
                        isSimulatorReady ? (
                          <Link
                            href={enterHref}
                            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Enter lab
                          </Link>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950 px-5 py-3 text-sm text-slate-400">
                            Simulator pending
                          </span>
                        )
                      ) : (
                        <Link
                          href={`/login?next=${encodeURIComponent(enterHref)}`}
                          className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                        >
                          Sign in to enter
                        </Link>
                      )}

                      <Link
                        href={`/learn/${lab.sourceChapterSlug}`}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                      >
                        Open source chapter
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    );
  }

  const accessState = await getCatalogAccessState("lab", labId, viewer);

  if (!accessState.item || (!accessState.isPublished && !viewer.isAdmin)) {
    notFound();
  }

  if (!accessState.canAccess) {
    return (
      <AuthRequiredContentShell
        item={accessState.item}
        kind="lab"
        nextPath={`/lab?lab=${encodeURIComponent(labId)}`}
      />
    );
  }

  if (!SUPPORTED_LAB_IDS.has(labId)) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Simulator pending</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{accessState.item.title}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This lab has been cataloged, but the state-driven simulator experience has not been
              wired into the current FabricLab lab engine yet. The content artifact is in the repo
              and can be released once the interactive lab implementation is ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/lab"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Back to labs
              </Link>
              <Link
                href={`/learn/${accessState.item.sourceChapterSlug}`}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Open source chapter
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<LabLoadingState />}>
      <LabExperience labId={labId} />
    </Suspense>
  );
}
