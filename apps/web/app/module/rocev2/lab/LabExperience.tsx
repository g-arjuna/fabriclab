"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import { LabResult } from "@/components/lab/LabResult";
import { MultiDeviceTerminal } from "@/components/terminal/MultiDeviceTerminal";
import { TopologyView } from "@/components/topology/TopologyView";
import { lab0, lab0Devices } from "@/data/labs/lab0-failed-rail";
import { lab1, lab1Devices } from "@/data/labs/lab1-pfc-fix";
import { lab2, lab2Devices } from "@/data/labs/lab2-congestion";
import { lab3, lab3Devices } from "@/data/labs/lab3-uneven-spine";
import { lab4, lab4Devices } from "@/data/labs/lab4-topology-sizing";
import { lab5, lab5Devices } from "@/data/labs/lab5-nccl-diagnosis";
import { isComplete } from "@/lib/labEngine";
import { formatConditionLabel } from "@/lib/formatters";
import { useLabStore } from "@/store/labStore";
import { useProgressStore } from "@/store/progressStore";

const LABS = {
  [lab0.id]: lab0,
  [lab1.id]: lab1,
  [lab2.id]: lab2,
  [lab3.id]: lab3,
  [lab4.id]: lab4,
  [lab5.id]: lab5,
};

const LAB_DEVICES = {
  [lab0.id]: lab0Devices,
  [lab1.id]: lab1Devices,
  [lab2.id]: lab2Devices,
  [lab3.id]: lab3Devices,
  [lab4.id]: lab4Devices,
  [lab5.id]: lab5Devices,
};

const LAB_SOURCE_CHAPTERS: Record<string, { slug: string; label: string }> = {
  [lab0.id]: { slug: "ch3-the-cli", label: "Chapter 3: The CLI" },
  [lab1.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab2.id]: { slug: "ch5-pfc-ecn-congestion", label: "Chapter 5: PFC & ECN" },
  [lab3.id]: { slug: "ch6-efficient-load-balancing", label: "Chapter 6: Efficient Load Balancing" },
  [lab4.id]: { slug: "ch7-topology-design", label: "Chapter 7: Topology Design" },
  [lab5.id]: { slug: "ch8-nccl-performance", label: "Chapter 8: NCCL" },
};

type LabId = keyof typeof LABS;

function formatElapsed(startTime: number | null, now: number): string {
  const elapsedSeconds = startTime ? Math.max(0, Math.floor((now - startTime) / 1000)) : 0;
  return `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
}

function KnowledgePanelDrawer() {
  const activeConceptId = useLabStore((state) => state.activeConceptId);
  const [isOpen, setIsOpen] = useState(false);
  const [wasAutoOpened, setWasAutoOpened] = useState(false);

  useEffect(() => {
    if (activeConceptId) {
      setIsOpen(true);
      setWasAutoOpened(true);
    }
  }, [activeConceptId]);

  useEffect(() => {
    if (!wasAutoOpened || !isOpen) return;
    const timer = window.setTimeout(() => {
      setIsOpen(false);
      setWasAutoOpened(false);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [wasAutoOpened, isOpen, activeConceptId]);

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setWasAutoOpened(false);
        }}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-white/10 bg-slate-900 px-2 py-4 text-slate-400 shadow-xl transition hover:bg-slate-800 hover:text-white"
        title={isOpen ? "Close reference panel" : "Open reference panel"}
      >
        <span className="text-[9px] uppercase tracking-widest" style={{ writingMode: "vertical-rl" }}>
          {isOpen ? "Close" : "Reference"}
        </span>
        <span className="text-xs">{isOpen ? "\u2192" : "\u2190"}</span>
      </button>

      {isOpen && (
        <div className="fixed right-0 top-0 z-30 h-full w-[380px] overflow-y-auto border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <span className="text-xs uppercase tracking-widest text-slate-400">Reference</span>
            <button
              onClick={() => {
                setIsOpen(false);
                setWasAutoOpened(false);
              }}
              className="text-slate-500 transition hover:text-white"
            >
              {"\u2715"}
            </button>
          </div>
          <div className="p-4">
            <KnowledgePanel />
          </div>
        </div>
      )}
    </>
  );
}

export function LabExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadLab = useLabStore((state) => state.loadLab);
  const resetLab = useLabStore((state) => state.resetLab);
  const completeLab = useLabStore((state) => state.completeLab);
  const setActiveDevice = useLabStore((state) => state.setActiveDevice);
  const openDeviceSession = useLabStore((state) => state.openDeviceSession);
  const labState = useLabStore((state) => state.lab);
  const markLabComplete = useProgressStore((state) => state.markLabComplete);
  const [topologyExpanded, setTopologyExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const requestedLabId = (searchParams.get("lab") as LabId | null) ?? lab1.id;
  const activeLab = useMemo(() => LABS[requestedLabId] ?? lab1, [requestedLabId]);
  const activeDevices = useMemo(() => LAB_DEVICES[activeLab.id] ?? [], [activeLab.id]);
  const sourceChapter = LAB_SOURCE_CHAPTERS[activeLab.id];
  const isLabComplete = useLabStore((state) => isComplete(state.lab, activeLab));

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLab(activeLab);
  }, [activeLab, loadLab]);

  useEffect(() => {
    if (activeLab.id === "lab4-topology-sizing") {
      openDeviceSession("workstation");
      setActiveDevice("workstation");
    }
  }, [activeLab.id, openDeviceSession, setActiveDevice]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId: string }>;
      openDeviceSession(customEvent.detail.deviceId);
      setActiveDevice(customEvent.detail.deviceId);
    };
    window.addEventListener("device-selected", handler as EventListener);
    return () => window.removeEventListener("device-selected", handler as EventListener);
  }, [openDeviceSession, setActiveDevice]);

  useEffect(() => {
    if (isLabComplete && !labState.isComplete) {
      completeLab();
    }
  }, [completeLab, isLabComplete, labState.isComplete]);

  useEffect(() => {
    if (labState.isComplete && labState.score !== null) {
      markLabComplete(activeLab.id, labState.score);
    }
  }, [activeLab.id, labState.isComplete, labState.score, markLabComplete]);

  const latestHint = useMemo(() => {
    if (labState.shownHintLevels.size === 0) return null;
    const highest = Math.max(...Array.from(labState.shownHintLevels));
    return activeLab.hints.find((hint) => hint.level === highest) ?? null;
  }, [activeLab.hints, labState.shownHintLevels]);

  const handleLabSelection = (labId: LabId) => {
    router.replace(`/lab?lab=${labId}`);
  };

  const handleReset = () => {
    resetLab();
    loadLab(activeLab);
  };

  return (
    <>
      <main className="flex h-screen flex-col overflow-hidden bg-[#07111f]">
        <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/8 bg-[#07111f] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/curriculum"
              className="flex-shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 transition hover:text-slate-200"
            >
              {"\u2190 Curriculum"}
            </Link>
            {sourceChapter && (
              <Link
                href={`/learn/${sourceChapter.slug}`}
                className="flex-shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 transition hover:text-slate-200"
              >
                {`\u2190 ${sourceChapter.label}`}
              </Link>
            )}
            <span className="ml-2 hidden truncate text-sm font-semibold text-white sm:block">
              {activeLab.title}
            </span>
          </div>

          <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900 p-1">
            {([lab0.id, lab1.id, lab2.id, lab3.id, lab4.id, lab5.id] as LabId[]).map((labId, index) => {
              const isActive = activeLab.id === labId;
              const shortLabels: Record<string, string> = {
                [lab0.id]: "Failed Rail",
                [lab1.id]: "PFC Fix",
                [lab2.id]: "Congestion",
                [lab3.id]: "Spine LB",
                [lab4.id]: "Topology",
                [lab5.id]: "NCCL",
              };

              return (
                <button
                  key={labId}
                  type="button"
                  onClick={() => handleLabSelection(labId)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="mb-0.5 block text-[9px] leading-none opacity-50">Lab {index}</span>
                  {shortLabels[labId]}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-[280px] flex-shrink-0 flex-col overflow-y-auto border-r border-white/8 bg-[#060d18] p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold leading-tight text-white">{activeLab.title}</h2>
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                  activeLab.difficulty === "beginner"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : activeLab.difficulty === "intermediate"
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {activeLab.difficulty}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-slate-900/60 px-4 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Elapsed</p>
              <p className="mt-0.5 font-mono text-2xl font-semibold text-cyan-300">
                {formatElapsed(labState.startTime, now)}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Scenario</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                {activeLab.scenario}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Conditions</p>
              <ul className="mt-3 space-y-2">
                {activeLab.requiredConditions.map((condition) => {
                  const isMet = labState.conditions[condition] === true;
                  const isVerified = labState.verifiedConditions.has(condition);

                  return (
                    <li
                      key={condition}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                        isMet && isVerified
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : isMet
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-white/8 bg-slate-900/50 text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          isMet && isVerified
                            ? "bg-emerald-500 text-slate-950"
                            : isMet
                            ? "bg-amber-400 text-slate-950"
                            : "border border-slate-600"
                        }`}
                      >
                        {isMet && isVerified ? "\u2713" : ""}
                      </span>
                      {formatConditionLabel(condition)}
                    </li>
                  );
                })}
              </ul>
            </div>

            {latestHint && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-200">
                <span className="font-semibold">Hint: </span>
                {latestHint.text}
              </div>
            )}
          </aside>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="relative flex-shrink-0" style={{ height: "220px" }}>
              <div className="h-full">
                <TopologyView compact />
              </div>

              <button
                onClick={() => setTopologyExpanded(true)}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] text-slate-400 backdrop-blur transition hover:text-white"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1h4M1 1v4M11 1h-4M11 1v4M1 11h4M1 11v-4M11 11h-4M11 11v-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Zoom
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <MultiDeviceTerminal devices={activeDevices} labTitle={activeLab.title} />
            </div>
          </div>
        </div>
      </main>

      {topologyExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setTopologyExpanded(false)}
        >
          <div
            className="relative flex h-[85vh] w-[85vw] max-w-[1200px] flex-col rounded-3xl border border-white/10 bg-[#060d18] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Topology — {activeLab.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">Reference view — use the device tabs below the topology to switch CLIs</p>
              </div>
              <button
                onClick={() => setTopologyExpanded(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                {"\u2715 Close"}
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6">
              <TopologyView />
            </div>
          </div>
        </div>
      )}

      <KnowledgePanelDrawer />

      {labState.isComplete && labState.score !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-6 backdrop-blur-sm">
          <LabResult score={labState.score} onReset={handleReset} labId={activeLab.id} />
        </div>
      )}
    </>
  );
}
