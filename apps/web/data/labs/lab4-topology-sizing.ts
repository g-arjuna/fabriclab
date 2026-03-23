import type { LabConfig, LabDevice } from "@/types";

export const lab4Devices: LabDevice[] = [
  {
    id: "workstation",
    type: "dgx",
    label: "Engineering Workstation",
    sublabel: "Topology sizing calculator",
    prompt: "engineer@workstation:~$",
    osLabel: "Ubuntu",
    allowedCommands: [
      "show proposal a",
      "show proposal b",
      "calculate oversubscription a",
      "calculate oversubscription b",
      "compare proposals",
      "recommend proposal a",
      "recommend proposal b",
      "recommend proposal",
      "help",
      "hint",
    ],
    position: { x: 200, y: 120 },
    status: "up",
  },
];

export const lab4: LabConfig = {
  id: "lab4-topology-sizing",
  title: "Evaluate topology proposals",
  difficulty: "intermediate",
  expectedMinutes: 15,
  scenario:
    "Two vendors propose switch configurations for a new\n"
    + "64-node DGX H100 cluster (512 NIC connections).\n\n"
    + "Proposal A: 32-port 400G switches, 2-stage design\n"
    + "Proposal B: 64-port 400G switches, 2-stage design\n\n"
    + "Requirements:\n"
    + "  - 64 DGX H100 nodes at full line rate\n"
    + "  - 1:1 non-blocking fabric\n\n"
    + "Evaluate both, then submit your recommendation\n"
    + "before the purchase order is signed.",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 0,
    proposalAInspected: false,
    proposalBInspected: false,
    proposalACalculated: false,
    proposalBCalculated: false,
    recommendationMade: false,
  },
  requiredConditions: [
    "proposalAInspected",
    "proposalBInspected",
    "oversubscriptionCalculated",
    "correctProposalIdentified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text: "Start by inspecting both proposals: 'show proposal a' and 'show proposal b'. Read the port counts carefully.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 180,
      text: "After inspecting, calculate the oversubscription ratio for each: 'calculate oversubscription a' and 'calculate oversubscription b'. The ratio = downlinks / uplinks per leaf switch.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 300,
      text: "One proposal is non-blocking (1:1), the other cannot connect all 64 nodes with the stated switch count. Use 'compare proposals' to see the verdict, then 'recommend proposal' with the correct letter.",
    },
  ],
};
