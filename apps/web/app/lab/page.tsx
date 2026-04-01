import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LabExperience } from "@/app/module/rocev2/lab/LabExperience";
import { AuthRequiredContentShell } from "@/components/catalog/AuthRequiredContentShell";
import { getServerViewer } from "@/lib/auth/server";
import { getCatalogAccessState } from "@/lib/catalog/runtime";

const SUPPORTED_LAB_IDS = new Set([
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
  const { lab: labId = "lab1-pfc-fix" } = await searchParams;
  const viewer = await getServerViewer();
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
          </div>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<LabLoadingState />}>
      <LabExperience />
    </Suspense>
  );
}
