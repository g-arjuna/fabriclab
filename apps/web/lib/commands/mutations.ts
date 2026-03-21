import type { CommandResult } from "@/types";
import { getCurrentHint } from "@/lib/labEngine";
import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";
import { useLabStore } from "@/store/labStore";

const LAB_CONFIGS = {
  [lab1.id]: lab1,
  [lab2.id]: lab2,
};

export function runMutation(command: string): CommandResult {
  const store = useLabStore.getState();

  switch (command) {
    case "disable pfc":
      store.setTopology({ pfcEnabled: false });
      store.setCondition("pfcDisabled", true);
      return {
        output: "PFC disabled on eth0. Verify with: show dcb pfc",
        conceptId: "pfc",
        type: "success",
      };
    case "enable pfc":
      store.setTopology({ pfcEnabled: true });
      store.setCondition("pfcDisabled", false);
      store.setCondition("pfcVerified", false);
      return {
        output: "PFC enabled on eth0.",
        conceptId: "pfc",
        type: "success",
      };
    case "enable ecn":
      store.setTopology({ ecnEnabled: true, congestionDetected: false });
      store.setCondition("ecnEnabled", true);
      return {
        output: "ECN enabled. DCQCN active. Verify with: show roce",
        conceptId: "ecn",
        type: "success",
      };
    case "disable ecn":
      store.setTopology({ ecnEnabled: false });
      store.setCondition("ecnEnabled", false);
      store.setCondition("ecnVerified", false);
      return {
        output: "ECN disabled on eth0.",
        conceptId: "ecn",
        type: "success",
      };
    case "clear counters eth0":
      store.setTopology({ congestionDetected: false, bufferUtilPct: 20 });
      store.setCondition("congestionChecked", false);
      return {
        output: "Interface counters cleared.",
        conceptId: "rocev2",
        type: "success",
      };
    case "help":
      return {
        output: `Available commands:
  show dcb pfc            Show Priority Flow Control state
  show dcb ets            Show ETS and ECN scheduling details
  show interface counters Show interface congestion counters
  ethtool -S eth0         Show NIC statistics
  rdma link show          Show RDMA link state
  show roce               Show RoCEv2 configuration
  disable pfc             Disable PFC on eth0
  enable pfc              Enable PFC on eth0
  enable ecn              Enable ECN and DCQCN
  disable ecn             Disable ECN
  clear counters eth0     Reset congestion counters
  help                    Show this command list
  hint                    Request the next lab hint`,
        type: "info",
      };
    case "hint": {
      const activeLab = store.lab.labId ? LAB_CONFIGS[store.lab.labId] : undefined;
      const hint = activeLab ? getCurrentHint(store.lab, activeLab) : null;

      if (hint) {
        store.useHint(hint.level);
        return {
          output: `[HINT] ${hint.text}`,
          type: "info",
        };
      }

      return {
        output: "Keep trying -- hints unlock after a few attempts.",
        type: "info",
      };
    }
    default:
      return {
        output: `ERROR: Unsupported mutation command: ${command}`,
        type: "error",
      };
  }
}
