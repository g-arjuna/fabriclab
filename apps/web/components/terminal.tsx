"use client";

import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useTopologyStore } from "@/store/topology";

export default function CliTerminal() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const commandBufferRef = useRef("");

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#111827",
        foreground: "#f9fafb",
      },
    });
    const fitAddon = new FitAddon();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.loadAddon(fitAddon);

    const writePrompt = () => {
      terminal.write("> ");
    };

    const openTimeout = window.setTimeout(() => {
      if (!containerRef.current) {
        return;
      }

      terminal.open(containerRef.current);
      containerRef.current.focus();
      fitAddon.fit();
      terminal.focus();
      writePrompt();
    }, 0);

    const disposable = terminal.onData((data) => {
      if (data === "\r") {
        const command = commandBufferRef.current;
        const {
          pfcEnabled,
          priorities,
          disablePfc,
          verifyPfc,
          incrementAttempts,
          incrementMistakes,
        } = useTopologyStore.getState();
        let output = "Unknown command";

        incrementAttempts();

        if (command === "show dcb pfc") {
          if (pfcEnabled === false) {
            verifyPfc();
          }
          output = pfcEnabled
            ? `PFC: enabled on priorities ${priorities.join(",")}`
            : "PFC: disabled";
        }

        if (command === "disable pfc") {
          disablePfc();
          output = "PFC disabled";
        }

        if (command.startsWith("disable") && command !== "disable pfc") {
          incrementMistakes();
          output = "Invalid target. Did you mean 'disable pfc'?";
        }

        if (
          command !== "show dcb pfc" &&
          command !== "disable pfc" &&
          command.startsWith("disable") === false
        ) {
          incrementMistakes();
        }

        terminal.write("\r\n");
        terminal.writeln(output);
        commandBufferRef.current = "";
        writePrompt();
        return;
      }

      if (data === "\u007f") {
        if (commandBufferRef.current.length === 0) {
          return;
        }

        commandBufferRef.current = commandBufferRef.current.slice(0, -1);
        terminal.write("\b \b");
        return;
      }

      if (data.length > 0 && data >= " ") {
        terminal.write(data);
        commandBufferRef.current += data;
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      terminal.focus();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      window.clearTimeout(openTimeout);
      resizeObserver.disconnect();
      disposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full w-full overflow-hidden outline-none"
    />
  );
}
