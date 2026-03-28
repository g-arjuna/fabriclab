"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type SolutionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  labId: string;
  title: string;
};

const SOLUTION_PATH_OVERRIDES: Record<string, string> = {
  "lab0-failed-rail": "/images/labs/lab0-failed-rail-solution.webp",
};

function getSolutionPath(labId: string) {
  return SOLUTION_PATH_OVERRIDES[labId] ?? `/images/labs/${labId}-solution.webp`;
}

export function SolutionModal({ isOpen, onClose, labId, title }: SolutionModalProps) {
  const [hasAssetError, setHasAssetError] = useState(false);
  const solutionSrc = useMemo(() => getSolutionPath(labId), [labId]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setHasAssetError(false);
  }, [labId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#08121f] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Solution Replay</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Hover over the replay to zoom into the terminal area for easier command reading.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            {"\u2715 Close"}
          </button>
        </div>

        <div className="overflow-auto p-6">
          {hasAssetError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm leading-7 text-amber-100">
              Solution recording pending for this lab. The replay modal is wired, but the asset is not available yet.
            </div>
          ) : (
            <div className="rounded-3xl border border-white/8 bg-[#020817] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
              <div className="group relative mx-auto aspect-video w-full max-w-[1400px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                <Image
                  src={solutionSrc}
                  alt={`${title} solution replay`}
                  width={1920}
                  height={1080}
                  unoptimized
                  priority
                  onError={() => setHasAssetError(true)}
                  className="h-full w-full object-contain transition duration-300 ease-out group-hover:scale-150 group-hover:origin-bottom"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SolutionModal;
