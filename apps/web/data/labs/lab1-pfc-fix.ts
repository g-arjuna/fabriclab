import type { LabConfig } from "@/types";

export const lab1: LabConfig = {
  id: "lab1-pfc-fix",
  title: "Fix the PFC misconfiguration",
  difficulty: "beginner",
  expectedMinutes: 10,
  scenario:
    "A RoCEv2 training workload on this node is experiencing frequent\nretransmissions, slowing GPU-to-GPU communication by approximately 35%.\nThe operations team suspects a PFC misconfiguration is causing a pause storm.\n\nDiagnose the current PFC state, identify the problem, and fix it.\nThen verify the fix using the appropriate show command.",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: true,
    bufferUtilPct: 92,
  },
  requiredConditions: ["pfcDisabled", "pfcVerified"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start by checking the current state of Priority Flow Control on this interface.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "The 'dcb' command family manages Data Center Bridging. Try 'show dcb pfc'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Run 'disable pfc' to turn off PFC, then verify the change with 'show dcb pfc'.",
    },
  ],
};
