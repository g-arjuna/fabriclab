import type { Terminal as XTerm } from "@xterm/xterm";

export type CompletionState = {
  sourceInput: string;
  matches: string[];
  index: number;
};

export const ARROW_UP_SEQUENCE = "\u001b[A";
export const ARROW_DOWN_SEQUENCE = "\u001b[B";
export const TAB_SEQUENCE = "\t";

export function replaceTerminalInput(
  terminal: XTerm,
  inputBufferRef: { current: string },
  nextInput: string,
) {
  while (inputBufferRef.current.length > 0) {
    inputBufferRef.current = inputBufferRef.current.slice(0, -1);
    terminal.write("\b \b");
  }

  inputBufferRef.current = nextInput;
  terminal.write(nextInput);
}

export function resetCompletionState(
  completionStateRef: { current: CompletionState | null },
) {
  completionStateRef.current = null;
}

export function appendTerminalInput(
  terminal: XTerm,
  inputBufferRef: { current: string },
  completionStateRef: { current: CompletionState | null },
  data: string,
) {
  const printableInput = data.replace(/[^\x20-\x7e]/g, "");
  if (printableInput.length === 0) {
    return;
  }

  inputBufferRef.current += printableInput;
  terminal.write(printableInput);
  resetCompletionState(completionStateRef);
}

export function scheduleClipboardPasteFallback(
  terminal: XTerm,
  inputBufferRef: { current: string },
  completionStateRef: { current: CompletionState | null },
) {
  const inputBeforePaste = inputBufferRef.current;

  window.setTimeout(() => {
    if (inputBufferRef.current !== inputBeforePaste || !navigator.clipboard?.readText) {
      return;
    }

    void navigator.clipboard
      .readText()
      .then((clipboardText) => {
        if (inputBufferRef.current !== inputBeforePaste) {
          return;
        }

        appendTerminalInput(
          terminal,
          inputBufferRef,
          completionStateRef,
          clipboardText,
        );
      })
      .catch(() => undefined);
  }, 50);
}

export function recallCommandHistory(
  terminal: XTerm,
  inputBufferRef: { current: string },
  commandHistoryRef: { current: string[] },
  historyIndexRef: { current: number | null },
  completionStateRef: { current: CompletionState | null },
  direction: "previous" | "next",
) {
  if (commandHistoryRef.current.length === 0) {
    return;
  }

  if (direction === "previous") {
    historyIndexRef.current =
      historyIndexRef.current === null
        ? commandHistoryRef.current.length - 1
        : Math.max(0, historyIndexRef.current - 1);
  } else if (historyIndexRef.current === null) {
    return;
  } else if (historyIndexRef.current >= commandHistoryRef.current.length - 1) {
    historyIndexRef.current = null;
    replaceTerminalInput(terminal, inputBufferRef, "");
    resetCompletionState(completionStateRef);
    return;
  } else {
    historyIndexRef.current += 1;
  }

  const nextInput =
    historyIndexRef.current === null
      ? ""
      : commandHistoryRef.current[historyIndexRef.current] ?? "";

  replaceTerminalInput(terminal, inputBufferRef, nextInput);
  resetCompletionState(completionStateRef);
}

export function autocompleteTerminalInput(
  terminal: XTerm,
  inputBufferRef: { current: string },
  commandOptions: string[],
  completionStateRef: { current: CompletionState | null },
) {
  const currentInput = inputBufferRef.current;
  if (currentInput.trim().length === 0) {
    return;
  }

  const activeCompletion = completionStateRef.current;
  if (
    activeCompletion
    && activeCompletion.matches.length > 0
    && activeCompletion.matches[activeCompletion.index] === currentInput
  ) {
    const nextIndex = (activeCompletion.index + 1) % activeCompletion.matches.length;
    completionStateRef.current = {
      ...activeCompletion,
      index: nextIndex,
    };
    replaceTerminalInput(terminal, inputBufferRef, activeCompletion.matches[nextIndex]);
    return;
  }

  const normalizedInput = currentInput.toLowerCase();
  const matches = Array.from(
    new Set(
      commandOptions.filter((command) =>
        command.toLowerCase().startsWith(normalizedInput),
      ),
    ),
  );

  if (matches.length === 0) {
    resetCompletionState(completionStateRef);
    return;
  }

  completionStateRef.current = {
    sourceInput: currentInput,
    matches,
    index: 0,
  };
  replaceTerminalInput(terminal, inputBufferRef, matches[0]);
}

export function rememberSubmittedCommand(
  commandHistoryRef: { current: string[] },
  historyIndexRef: { current: number | null },
  completionStateRef: { current: CompletionState | null },
  command: string,
) {
  if (command.length > 0) {
    const lastCommand =
      commandHistoryRef.current[commandHistoryRef.current.length - 1];
    if (lastCommand !== command) {
      commandHistoryRef.current = [...commandHistoryRef.current, command];
    }
  }

  historyIndexRef.current = null;
  resetCompletionState(completionStateRef);
}
