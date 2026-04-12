import type { CommandResult } from "@/types";
import { getCurrentHint } from "@/lib/labEngine";
import { lab1 } from "@/data/labs/lab1-pfc-fix";
import { lab2 } from "@/data/labs/lab2-congestion";
import { lab3 } from "@/data/labs/lab3-uneven-spine";
import { lab4 } from "@/data/labs/lab4-topology-sizing";
import { lab5 } from "@/data/labs/lab5-nccl-diagnosis";
import { lab7 } from "@/data/labs/lab7-pause-storm";
import { lab8 } from "@/data/labs/lab8-pfc-priority-mismatch";
import { lab10 } from "@/data/labs/lab10-ecmp-hotspot";
import { lab11 } from "@/data/labs/lab11-bgp-path-failure";
import { lab14 } from "@/data/labs/lab14-srv6-te-path-steering";
import { lab15 } from "@/data/labs/lab15-rdma-rkey-exposure";
import { lab16 } from "@/data/labs/lab16-spectrum-x-platform-audit";
import { lab17 } from "@/data/labs/lab17-roce-day-zero-config";
import { lab18 } from "@/data/labs/lab18-ecn-threshold-tuning";
import { lab19 } from "@/data/labs/lab19-adaptive-routing-imbalance";
import { lab20 } from "@/data/labs/lab20-evpn-tenant-leak";
import {
  applyRouteMapSwp14,
  configureRouteMapDscp10,
  configureSegmentList,
  configureSrtePolicy,
} from "@/lib/commands/lab14Handlers";
import {
  handleLab1NvConfigApply,
  handleLab1NvSetQosRoce,
} from "@/lib/commands/lab1Handlers";
import {
  handleLab2NvConfigApply,
  handleLab2NvSetQosCongestionControlTc3EcnEnabled,
} from "@/lib/commands/lab2Handlers";
import {
  handleLab3EnableAdaptiveRouting,
  handleLab3NvConfigApply,
} from "@/lib/commands/lab3Handlers";
import {
  handleLab7NvConfigApply,
  handleLab7NvSetQosCongestionControlTc3EcnEnabled,
} from "@/lib/commands/lab7Handlers";
import {
  enableGidFilter,
  ibvRegMrRotate,
  rkeyScan,
} from "@/lib/commands/lab15Handlers";
import {
  handleLab8NvConfigApply,
  handleLab8NvSetQosRoce,
} from "@/lib/commands/lab8Handlers";
import { handleLab10NvConfigApply } from "@/lib/commands/lab10Handlers";
import { handleLab11NvConfigApply } from "@/lib/commands/lab11Handlers";
import {
  handleNvConfigApply,
  handleNvConfigSave,
  handleNvSetRoce,
} from "@/lib/commands/lab17Handlers";
import {
  handleLab18ConfigApply,
  handleLab18SetEcnMax,
  handleLab18SetEcnMin,
} from "@/lib/commands/lab18Handlers";
import {
  handleDgxNvConfigApply,
  handleLab19NvConfigApply,
  handleSetARModePerFlowlet,
  handleSetARModePerPacket,
  handleSetFlowletTimer,
  handleSetReorderBufferEnable,
} from "@/lib/commands/lab19Handlers";
import {
  handleLeaf02BgpSoftReset,
  handleLeaf02ConfigApply,
  handleLeaf02UnsetRtImport,
} from "@/lib/commands/lab20Handlers";
import { useLabStore } from "@/store/labStore";

const LAB_CONFIGS = {
  [lab1.id]: lab1,
  [lab2.id]: lab2,
  [lab3.id]: lab3,
  [lab4.id]: lab4,
  [lab5.id]: lab5,
  [lab10.id]: lab10,
  [lab11.id]: lab11,
  [lab14.id]: lab14,
  [lab15.id]: lab15,
  [lab16.id]: lab16,
  [lab17.id]: lab17,
  [lab18.id]: lab18,
  [lab19.id]: lab19,
  [lab20.id]: lab20,
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
      store.markVerified("lbEnabled");
      return {
        output: "Per-packet load balancing enabled. RSHP active.\n"
          + "AllReduce traffic will now be distributed across all\n"
          + "equal-cost paths. Verify with: show interface counters\n"
          + "on the spine switch.",
        conceptId: "rocev2",
        type: "success",
      };
    case "set nccl ib-hca":
    case "set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7":
    case "export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1": {
      store.setTopology({
        ...(store.topology as object),
        ncclIbHca: "mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1",
        ncclTransport: "net",
        ncclTestsFixed: true,
        ncclTestsBusbw: 146.6,
      } as typeof store.topology);
      store.setCondition("hcaFixed", true);
      store.markVerified("hcaFixed");
      return {
        output: "NCCL_IB_HCA set to: mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1\n"
          + "This matches the RoCEv2 RDMA device names from rdma link show.\n"
          + "NET/IB transport is now available. Also set NCCL_SOCKET_IFNAME=eno1 so NCCL bootstrap stays on the management network.",
        conceptId: "rocev2",
        type: "success",
      };
    }
    case "set nccl socket-ifname":
    case "set nccl socket-ifname eno1":
    case "export NCCL_SOCKET_IFNAME=eno1": {
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
              ? "Both env variables are now correct. Rerun all_reduce_perf with NCCL_DEBUG=INFO to verify NET/IB transport."
              : "Still need to fix NCCL_IB_HCA. Run: export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1"
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
    case "nv set interface swp1-32 qos roce":
      return handleNvSetRoce();
    case "nv set qos roce":
      if (store.lab.labId === lab17.id) {
        return handleNvSetRoce();
      }
      if (store.lab.labId === lab8.id) {
        return handleLab8NvSetQosRoce();
      }
      return handleLab1NvSetQosRoce();
    case "nv set qos congestion-control default-global traffic-class 3 ecn enabled":
      if (store.lab.labId === lab7.id) {
        return handleLab7NvSetQosCongestionControlTc3EcnEnabled();
      }
      return handleLab2NvSetQosCongestionControlTc3EcnEnabled();
    case "nv config apply":
      if (store.lab.labId === lab1.id) {
        return handleLab1NvConfigApply();
      }
      if (store.lab.labId === lab2.id) {
        return handleLab2NvConfigApply();
      }
      if (store.lab.labId === lab3.id) {
        return handleLab3NvConfigApply();
      }
      if (store.lab.labId === lab7.id) {
        return handleLab7NvConfigApply();
      }
      if (store.lab.labId === lab8.id) {
        return handleLab8NvConfigApply();
      }
      if (store.lab.labId === lab10.id) {
        return handleLab10NvConfigApply();
      }
      if (store.lab.labId === lab11.id) {
        return handleLab11NvConfigApply();
      }
      if (store.lab.labId === lab19.id) {
        return store.activeDeviceId === "dgx-node-01"
          ? handleDgxNvConfigApply()
          : handleLab19NvConfigApply();
      }
      if (store.lab.labId === lab20.id) {
        return handleLeaf02ConfigApply();
      }
      return store.lab.labId === lab18.id ? handleLab18ConfigApply() : handleNvConfigApply();
    case "nv config save":
      return handleNvConfigSave();
    case "nv set qos ecn profile roce min-threshold 500000":
      return handleLab18SetEcnMin();
    case "nv set qos ecn profile roce max-threshold 1500000":
      return handleLab18SetEcnMax();
    case "nv set qos congestion-control default-global traffic-class 3 min-threshold 500000":
      return handleLab18SetEcnMin();
    case "nv set qos congestion-control default-global traffic-class 3 max-threshold 1500000":
      return handleLab18SetEcnMax();
    case "nv set router adaptive-routing mode per-packet":
      return handleSetARModePerPacket();
    case "nv set router adaptive-routing mode per-flowlet":
      return handleSetARModePerFlowlet();
    case "nv set router adaptive-routing flowlet-timer 100us":
      return handleSetFlowletTimer("100us");
    case "nv set router adaptive-routing flowlet-timer 1s":
      return handleSetFlowletTimer("1s");
    case "nv set interface eth0 reorder-buffer enable":
      return handleSetReorderBufferEnable("eth0");
    case "nv set interface eth1 reorder-buffer enable":
      return handleSetReorderBufferEnable("eth1");
    case "nv unset vrf VRF_B router bgp route-import from-evpn route-target 65000:100":
      return handleLeaf02UnsetRtImport();
    case "net clear bgp vrf VRF_B *":
      return handleLeaf02BgpSoftReset();
    case "enable gid filter":
      return enableGidFilter();
    case "ibv_reg_mr rotate":
      return ibvRegMrRotate();
    case "rkey scan":
      return rkeyScan();
    case "nv set interface swp51 router adaptive-routing enable on":
      return handleLab3EnableAdaptiveRouting("swp51");
    case "nv set interface swp52 router adaptive-routing enable on":
      return handleLab3EnableAdaptiveRouting("swp52");
    case "nv set interface swp53 router adaptive-routing enable on":
      return handleLab3EnableAdaptiveRouting("swp53");
    case "nv set interface swp54 router adaptive-routing enable on":
      return handleLab3EnableAdaptiveRouting("swp54");
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
