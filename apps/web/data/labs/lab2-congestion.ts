import { lab1Devices } from "@/data/labs/lab1-pfc-fix";
import type { LabConfig, LabDevice } from "@/types";

export const lab2Devices: LabDevice[] = lab1Devices;

export const lab2: LabConfig = {
  id: "lab2-congestion",
  title: "Diagnose fabric congestion",
  difficulty: "intermediate",
  expectedMinutes: 15,
  scenario:
    "GPU training throughput has dropped 40% across this node's RoCEv2 links.\nMonitoring shows elevated buffer utilisation but the team cannot identify\nthe root cause.\n\nUse CLI tools to diagnose why congestion is occurring, then add the correct congestion signalling mechanism alongside PFC.",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: false,
    silentCongestion: true,
    bufferUtilPct: 87,
  },
  requiredConditions: ["congestionChecked", "ecnEnabled", "ecnVerified"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start by looking at the interface counters. What metric stands out?",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "ECN signals congestion before buffers overflow. Check whether it is configured.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Run 'show interface counters' to diagnose, then 'enable ecn', then verify with 'show roce'.",
    },
  ],
};
