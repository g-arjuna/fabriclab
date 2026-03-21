"use client";

import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";

import { handleCommand } from "@/components/terminal/commandHandler";

const PROMPT = "fabric-sim:~$ ";

function colorizeOutput(output: string): string {
  return output
    .split("\n")
    .map((line) => {
      if (line.startsWith("WARNING")) {
        return `\x1b[33m${line}\x1b[0m`;
      }

      if (line.startsWith("ERROR")) {
        return `\x1b[31m${line}\x1b[0m`;
      }

      if (line.startsWith("[HINT]")) {
        return `\x1b[36m${line}\x1b[0m`;
      }

      if (line.includes("Did you mean:")) {
        return `\x1b[37m${line.replace(
          /Did you mean: .+\?/,
          (match) => `\x1b[36m${match}\x1b[0m`,
        )}\x1b[0m`;
      }

      return `\x1b[37m${line}\x1b[0m`;
    })
    .join("\r\n");
}

export function Terminal({ labTitle }: { labTitle: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef("");

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const terminal = new XTerm({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      theme: {
        background: "#0a0f1a",
        foreground: "#e2e8f0",
      },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const welcomeLines = [
      "FabricLab CLI Simulator -- RoCEv2 + Lossless Ethernet",
      `Lab: ${labTitle ?? "No lab loaded"}`,
      "",
      "Type 'help' to see all commands.",
      "Type 'hint' if you get stuck -- it costs 10 points but saves frustration.",
      "",
    ];

    welcomeLines.forEach((line) => {
      terminal.writeln(line);
    });
    terminal.write(PROMPT);

    const replaceInput = (nextInput: string) => {
      while (inputBufferRef.current.length > 0) {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        terminal.write("\b \b");
      }

      inputBufferRef.current = nextInput;
      terminal.write(nextInput);
    };

    const handleInsertCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command: string }>;
      replaceInput(customEvent.detail.command);
    };

    window.addEventListener("insert-command", handleInsertCommand as EventListener);

    const disposable = terminal.onData((data) => {
      if (data === "\r") {
        const currentInput = inputBufferRef.current;
        terminal.write("\r\n");

        const output = handleCommand(currentInput);
        if (output.trim().length > 0) {
          terminal.write(`${colorizeOutput(output)}\r\n`);
        }

        inputBufferRef.current = "";
        terminal.write(PROMPT);
        return;
      }

      if (data === "\u0008" || data === "\u007f") {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }

      if (data === "\u001b[3~") {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }

      if (/[\x20-\x7e]/.test(data)) {
        inputBufferRef.current += data;
        terminal.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("insert-command", handleInsertCommand as EventListener);
      disposable.dispose();
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [labTitle]);

  return <div ref={containerRef} className="h-full min-h-[320px] w-full" />;
}

export default Terminal;
