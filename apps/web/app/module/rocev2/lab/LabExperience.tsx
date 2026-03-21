"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import { LabPanel } from "@/components/lab/LabPanel";
import { LabResult } from "@/components/lab/LabResult";
import Terminal from "@/components/terminal/Terminal";
import { TopologyView } from "@/components/topology/TopologyView";
import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";
import { isComplete } from "@/lib/labEngine";
import { useLabStore } from "@/store/labStore";

const LABS = {
  [lab1.id]: lab1,
  [lab2.id]: lab2,
};

type LabId = keyof typeof LABS;

export function LabExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadLab = useLabStore((state) => state.loadLab);
  const resetLab = useLabStore((state) => state.resetLab);
  const completeLab = useLabStore((state) => state.completeLab);
  const lab = useLabStore((state) => state.lab);
  const labStartTime = useLabStore((state) => state.lab.startTime);

  const requestedLabId = (searchParams.get("lab") as LabId | null) ?? lab1.id;
  const activeLab = useMemo(() => LABS[requestedLabId] ?? lab1, [requestedLabId]);
  const isLabComplete = useLabStore((state) => isComplete(state.lab, activeLab));

  useEffect(() => {
    loadLab(activeLab);
  }, [activeLab, loadLab]);

  useEffect(() => {
    if (isLabComplete && !lab.isComplete) {
      completeLab();
    }
  }, [completeLab, isLabComplete, lab.isComplete]);

  const handleLabSelection = (labId: LabId) => {
    router.replace(`/module/rocev2/lab?lab=${labId}`);
  };

  const handleReset = () => {
    resetLab();
    loadLab(activeLab);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#020617_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1800px] flex-col">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {([lab1.id, lab2.id] as LabId[]).map((labId, index) => {
            const isActive = activeLab.id === labId;

            return (
              <button
                key={labId}
                type="button"
                onClick={() => handleLabSelection(labId)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Lab {index + 1}
              </button>
            );
          })}
        </div>

        <div className="grid flex-1 gap-4 xl:grid-cols-[25%_35%_40%]">
          <LabPanel config={activeLab} />
          <TopologyView />
          <KnowledgePanel />
        </div>

        <div className="mt-4 flex min-h-[360px] flex-1 rounded-[2rem] border border-white/10 bg-[#0a0f1a] p-4 shadow-2xl shadow-slate-950/30">
          <Terminal key={labStartTime ?? "idle"} labTitle={activeLab.title} />
        </div>
      </div>

      {lab.isComplete && lab.score !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-sm">
          <LabResult score={lab.score} onReset={handleReset} />
        </div>
      ) : null}
    </main>
  );
}
