"use client";

import { useEffect, useMemo, useState } from "react";

import { getSolutionGuide } from "@/data/labs/solutionGuides";

type SolutionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  labId: string;
  title: string;
};

export function SolutionModal({ isOpen, onClose, labId, title }: SolutionModalProps) {
  const guide = useMemo(() => getSolutionGuide(labId), [labId]);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCopiedCommand(null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const copyCommand = async (command: string) => {
    let didCopy = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(command);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy) {
      const textArea = document.createElement("textarea");
      textArea.value = command;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      didCopy = document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    if (!didCopy) {
      return;
    }

    setCopiedCommand(command);
    window.setTimeout(() => setCopiedCommand(null), 1200);
  };

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
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Solution Guide</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Follow the command sequence below in the listed device terminal tabs.
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
          {!guide ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm leading-7 text-amber-100">
              A step-by-step solution guide is not available for this lab yet. Use the hints panel in the
              sidebar while we fill this gap.
            </div>
          ) : (
            <div className="space-y-4">
              {guide.steps.map((step, index) => (
                <section
                  key={`${guide.labId}-${index + 1}-${step.title}`}
                  className="rounded-3xl border border-white/8 bg-[#020817] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 font-mono text-sm font-semibold text-cyan-200">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold text-white">{step.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{step.details}</p>

                      <div className="mt-4 space-y-3">
                        {step.commands.map((commandItem, commandIndex) => (
                          <div
                            key={`${commandItem.deviceId}-${commandIndex}-${commandItem.command}`}
                            className="rounded-2xl border border-white/8 bg-slate-950/70 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                                {commandItem.deviceId}
                              </p>
                              <button
                                type="button"
                                onClick={() => void copyCommand(commandItem.command)}
                                className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-100"
                                aria-label={`Copy command: ${commandItem.command}`}
                              >
                                {copiedCommand === commandItem.command ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-900/70 px-4 py-3 font-mono text-sm leading-6 text-cyan-100">
                              <code>{commandItem.command}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SolutionModal;
