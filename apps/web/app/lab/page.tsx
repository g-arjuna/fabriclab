import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LabExperience } from "@/app/module/rocev2/lab/LabExperience";
import { getServerViewer } from "@/lib/auth/server";
import { getCatalogAccessState } from "@/lib/catalog/runtime";

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
    notFound();
  }

  return (
    <Suspense fallback={<LabLoadingState />}>
      <LabExperience />
    </Suspense>
  );
}
