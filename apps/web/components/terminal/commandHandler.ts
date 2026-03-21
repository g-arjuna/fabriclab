import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";
import { ethtoolStats } from "@/lib/commands/ethtoolStats";
import { runMutation } from "@/lib/commands/mutations";
import { rdmaLinkShow } from "@/lib/commands/rdmaLinkShow";
import { showDcbEts } from "@/lib/commands/showDcbEts";
import { showDcbPfc } from "@/lib/commands/showDcbPfc";
import { showInterfaceCounters } from "@/lib/commands/showInterfaceCounters";
import { showRoce } from "@/lib/commands/showRoce";
import { classifyCommand } from "@/lib/commandClassifier";
import { getCurrentHint } from "@/lib/labEngine";
import type { CommandResult, LabConfig } from "@/types";
import { useLabStore } from "@/store/labStore";

const LAB_CONFIGS: Record<string, LabConfig> = {
  [lab1.id]: lab1,
  [lab2.id]: lab2,
};

const EXACT_HANDLERS: Record<string, () => CommandResult> = {
  "show dcb pfc": showDcbPfc,
  "show dcb ets": showDcbEts,
  "show interface counters": showInterfaceCounters,
  "ethtool -s eth0": ethtoolStats,
  "rdma link show": rdmaLinkShow,
  "show roce": showRoce,
  "disable pfc": () => runMutation("disable pfc"),
  "enable pfc": () => runMutation("enable pfc"),
  "enable ecn": () => runMutation("enable ecn"),
  "disable ecn": () => runMutation("disable ecn"),
  "clear counters eth0": () => runMutation("clear counters eth0"),
  help: () => runMutation("help"),
  hint: () => runMutation("hint"),
};

export function handleCommand(input: string): string {
  const classification = classifyCommand(input);
  const store = useLabStore.getState();

  switch (classification.type) {
    case "near-miss":
      store.incrementNearMiss();
      return `Unknown command. Did you mean: ${classification.suggestion}?`;
    case "exploratory":
      return "Unknown arguments. Type 'help' to see available commands.";
    case "gibberish":
      store.incrementMistake();
      return `Command not found: ${input}`;
    case "exact":
      break;
  }

  const normalizedInput = input.trim().toLowerCase();
  const handler = classification.handler
    ? EXACT_HANDLERS[classification.handler]
    : undefined;

  if (!handler) {
    return `Command not found: ${input}`;
  }

  const result = handler();
  const updatedStore = useLabStore.getState();

  if (result.conceptId) {
    updatedStore.setActiveConceptId(result.conceptId);
  }

  const activeLab = updatedStore.lab.labId
    ? LAB_CONFIGS[updatedStore.lab.labId]
    : undefined;

  let finalOutput = result.output;

  if (activeLab && normalizedInput !== "hint") {
    const hint = getCurrentHint(useLabStore.getState().lab, activeLab);

    if (hint) {
      useLabStore.getState().useHint(hint.level);
      finalOutput = `${finalOutput}\n[HINT] ${hint.text}`;
    }
  }

  return finalOutput;
}
