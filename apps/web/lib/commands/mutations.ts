import type { CommandResult } from "@/types";
import { getCurrentHint } from "@/lib/labEngine";
import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";
import { lab3 } from "@/data/labs/lab3-uneven-spine";
import { lab4 } from "@/data/labs/lab4-topology-sizing";
import { lab5 } from "@/data/labs/lab5-nccl-diagnosis";
import { lab14 } from "@/data/labs/lab14-srv6-te-path-steering";
import {
  applyRouteMapSwp14,
  configureRouteMapDscp10,
  configureSegmentList,
  configureSrtePolicy,
} from "@/lib/commands/lab14Handlers";
import { useLabStore } from "@/store/labStore";

const LAB_CONFIGS = {
  [lab1.id]: lab1,
  [lab2.id]: lab2,
  [lab3.id]: lab3,
  [lab4.id]: lab4,
  [lab5.id]: lab5,
  [lab14.id]: lab14,
};

export function runMutation(command: string): CommandResult {
  const store = useLabStore.getState();

  switch (command) {
    case "disable pfc":
      store.setTopology({ pfcEnabled: false });
      store.setCondition("pfcDisabled", true);
      return {
        output: "PFC disabled on server-facing ports (swp1-32).\nWARNING: Fabric is now lossy â€” packet drops will occur under congestion.",
        conceptId: "pfc",
        type: "success",
      };
    case "enable pfc":
      store.setTopology({ pfcEnabled: true });
      store.setCondition("pfcEnabled", true);
      store.markVerified("pfcEnabled");
      return {
        output: "PFC enabled on server-facing ports (swp1-32).\nVerify with: show dcb pfc",
        conceptId: "pfc",
        type: "success",
      };
    case "enable pfc priority 3":
      store.setTopology({
        pfcEnabled: true,
        pfcPriority: 3,
        congestionDetected: false,
        bufferUtilPct: 18,
      } as any);
      store.setCondition("pfcPriorityFixed", true);
      store.markVerified("pfcPriorityFixed");
      store.setCondition("pfcEnabled", true);
      
      // Prevent order sensitivity deadlock for Lab 8
      store.setCondition("dropsConfirmed", true);
      store.markVerified("dropsConfirmed");
      store.setCondition("pfcPriorityInspected", true);
      store.markVerified("pfcPriorityInspected");
      store.setCondition("mismatchIdentified", true);
      store.markVerified("mismatchIdentified");
      return {
        output: "PFC reconfigured to priority 3 (cos3).\n"
          + "RoCEv2 traffic (DSCP 26 -> cos3) is now protected by PFC.\n"
          + "Verify with: show dcb pfc   and   ethtool -S eth0",
        conceptId: "pfc",
        type: "success",
      };
    case "enable ecn":
      store.setTopology({
        ecnEnabled: true,
        congestionDetected: false,
        silentCongestion: false,
        pauseStorm: false,
        bufferUtilPct: 12,
      });
      store.setCondition("ecnEnabled", true);
      store.markVerified("ecnEnabled");
      return {
        output: "ECN enabled. DCQCN is now active.\n"
          + "Senders are receiving CE marks and reducing injection rate.\n"
          + "If a PFC pause storm was active, it should subside within seconds.\n"
          + "Verify with: show dcb ets   and   ethtool -S eth0",
        conceptId: "ecn",
        type: "success",
      };
    case "enable load-balance per-packet":
      store.setTopology({
        ...(store.topology as object),
        lbMode: "per-packet",
        unevenSpine: false,
        bufferUtilPct: 30,
      } as typeof store.topology);
      store.setCondition("lbEnabled", true);
      return {
        output: "Per-packet load balancing enabled. RSHP active.\n"
          + "AllReduce traffic will now be distributed across all\n"
          + "equal-cost paths. Verify with: show interface counters\n"
          + "on the spine switch.",
        conceptId: "rocev2",
        type: "success",
      };
    case "set nccl ib-hca":
    case "set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7": {
      const socketAlreadyFixed = (store.topology as any).ncclSocketIfname === "eno1";
      store.setTopology({
        ...(store.topology as object),
        ncclIbHca: "mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1",
        ncclTransport: socketAlreadyFixed ? "net" : (store.topology as any).ncclTransport,
        ncclTestsFixed: socketAlreadyFixed,
        ncclTestsBusbw: socketAlreadyFixed ? 146.6 : (store.topology as any).ncclTestsBusbw,
      } as typeof store.topology);
      store.setCondition("hcaFixed", true);
      store.markVerified("hcaFixed");
      return {
        output: "NCCL_IB_HCA set to: mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1\n"
          + "This matches the RoCEv2 RDMA device names from rdma link show.\n"
          + "Also fix NCCL_SOCKET_IFNAME if not done: set nccl socket-ifname eno1",
        conceptId: "rocev2",
        type: "success",
      };
    }
    case "set nccl socket-ifname":
    case "set nccl socket-ifname eno1": {
      const hcaAlreadyFixed = (store.topology as any).ncclIbHca?.includes("mlx5_0:1");
      store.setTopology({
        ...(store.topology as object),
        ncclSocketIfname: "eno1",
        ncclTransport: hcaAlreadyFixed ? "net" : (store.topology as any).ncclTransport,
        ncclTestsFixed: hcaAlreadyFixed,
        ncclTestsBusbw: hcaAlreadyFixed ? 146.6 : (store.topology as any).ncclTestsBusbw,
      } as typeof store.topology);
      store.setCondition("socketFixed", true);
      store.markVerified("socketFixed");
      return {
        output: "NCCL_SOCKET_IFNAME set to: eno1 (management ethernet)\n"
          + (
            hcaAlreadyFixed
              ? "Both env variables are now correct. Run: run nccl-tests to verify."
              : "Still need to fix NCCL_IB_HCA. Run: set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7"
          ),
        conceptId: "rocev2",
        type: "success",
      };
    }
    case "disable ecn":
      store.setTopology({ ecnEnabled: false });
      store.setCondition("ecnEnabled", false);
      store.setCondition("ecnVerified", false);
      return {
        output: "ECN disabled.",
        conceptId: "ecn",
        type: "success",
      };
    case "clear counters":
      store.setTopology({
        congestionDetected: false,
        silentCongestion: false,
        bufferUtilPct: 20,
      });
      store.setCondition("congestionChecked", false);
      return {
        output: "Interface counters cleared on all ports.",
        conceptId: "rocev2",
        type: "success",
      };
    case "configure segment-list":
      return configureSegmentList();
    case "configure sr-te policy":
      return configureSrtePolicy();
    case "configure route-map dscp10":
      return configureRouteMapDscp10();
    case "apply route-map swp1-4":
      return applyRouteMapSwp14();
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
  clear counters          Reset congestion counters
  show proposal a         Show Proposal A switch specs and port counts
  show proposal b         Show Proposal B switch specs and port counts
  calculate oversubscription a   Calculate oversubscription ratio for Proposal A
  calculate oversubscription b   Calculate oversubscription ratio for Proposal B
  compare proposals       Side-by-side comparison of both proposals
  recommend proposal a    Submit recommendation for Proposal A
  recommend proposal b    Submit recommendation for Proposal B
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
