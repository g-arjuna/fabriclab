import { Suspense } from "react";

import { LabExperience } from "@/app/module/rocev2/lab/LabExperience";

function LabLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 px-8 py-6 text-sm text-slate-300 shadow-2xl shadow-slate-950/40 backdrop-blur">
        Preparing lab environment...
      </div>
    </main>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={<LabLoadingState />}>
      <LabExperience />
    </Suspense>
  );
}
