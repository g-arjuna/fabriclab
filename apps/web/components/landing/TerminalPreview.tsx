"use client";

import { useEffect, useState } from "react";

const TERMINAL_LINES = [
  { text: "fabric-sim:~$ show dcb pfc", color: "#e2e8f0" },
  { text: "Interface swp3", color: "#94a3b8" },
  { text: "  Priority Flow Control:  enabled", color: "#94a3b8" },
  { text: "  PFC enabled priorities: 3 (cos3)", color: "#94a3b8" },
  { text: "  Watchdog:               enabled", color: "#22d3ee" },
  { text: "", color: "#94a3b8" },
  { text: "fabric-sim:~$ show roce", color: "#e2e8f0" },
  { text: "DSCP 26 maps to cos3 on this fabric.", color: "#22c55e" },
];

export function TerminalPreview() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const timeoutId = window.setTimeout(() => {
        setVisibleLines(0);
        setCurrentChar(0);
        setIsPaused(false);
      }, 3000);

      return () => window.clearTimeout(timeoutId);
    }

    const intervalId = window.setInterval(() => {
      setVisibleLines((currentVisibleLines) => {
        if (currentVisibleLines >= TERMINAL_LINES.length) {
          return currentVisibleLines;
        }

        const line = TERMINAL_LINES[currentVisibleLines];

        setCurrentChar((currentCurrentChar) => {
          if (currentCurrentChar < line.text.length) {
            return currentCurrentChar + 1;
          }

          if (currentVisibleLines + 1 >= TERMINAL_LINES.length) {
            setIsPaused(true);
          }

          window.setTimeout(() => {
            setVisibleLines(currentVisibleLines + 1);
            setCurrentChar(0);
          }, 0);

          return currentCurrentChar;
        });

        return currentVisibleLines;
      });
    }, 25);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  return (
    <>
      <style>{`@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
    <div className="mt-12 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1a] text-left shadow-2xl shadow-slate-950/50">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-rose-400" />
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-slate-500">FabricLab CLI</span>
      </div>
      <div className="h-48 space-y-1 p-4 font-mono text-sm">
        {TERMINAL_LINES.map((line, index) => {
          if (index < visibleLines) {
            return (
              <div key={`${line.text}-${index}`} style={{ color: line.color }}>
                {line.text || "\u00A0"}
              </div>
            );
          }

          if (index === visibleLines && !isPaused) {
            return (
              <div key={`${line.text}-${index}`} style={{ color: line.color }}>
                {line.text.slice(0, currentChar)}
                <span className="inline-block h-4 w-2 translate-y-0.5 bg-cyan-400 align-middle animate-[blink_0.5s_steps(1)_infinite]" />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
    </>
  );
}
