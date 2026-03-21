import { create } from "zustand";

import type { LabConfig, LabState, TopologyState } from "@/types";

type StoreState = {
  topology: TopologyState;
  lab: LabState;
  activeConceptId: string | null;
  setTopology: (patch: Partial<TopologyState>) => void;
  loadLab: (config: LabConfig) => void;
  setCondition: (key: string, value: boolean) => void;
  markVerified: (key: string) => void;
  incrementMistake: () => void;
  incrementNearMiss: () => void;
  useHint: (level: number) => void;
  completeLab: () => void;
  resetLab: () => void;
  setActiveConceptId: (id: string | null) => void;
};

const defaultTopology: TopologyState = {
  nic: { name: "eth0", speed: 400, state: "up" },
  pfcEnabled: true,
  ecnEnabled: false,
  congestionDetected: false,
  bufferUtilPct: 20,
};

const createDefaultLabState = (): LabState => ({
  labId: null,
  conditions: {},
  verifiedConditions: new Set(),
  mistakeCount: 0,
  nearMissCount: 0,
  hintsUsed: 0,
  shownHintLevels: new Set(),
  startTime: null,
  isComplete: false,
  score: null,
});

export const useLabStore = create<StoreState>((set) => ({
  topology: defaultTopology,
  lab: createDefaultLabState(),
  activeConceptId: null,
  setTopology: (patch) =>
    set((state) => ({
      topology: {
        ...state.topology,
        ...patch,
        nic: {
          ...state.topology.nic,
          ...(patch.nic ?? {}),
        },
      },
    })),
  loadLab: (config) =>
    set(() => ({
      topology: {
        ...defaultTopology,
        ...config.initialTopology,
        nic: {
          ...defaultTopology.nic,
          ...(config.initialTopology.nic ?? {}),
        },
      },
      lab: {
        ...createDefaultLabState(),
        labId: config.id,
        startTime: Date.now(),
      },
      activeConceptId: null,
    })),
  setCondition: (key, value) =>
    set((state) => ({
      lab: {
        ...state.lab,
        conditions: {
          ...state.lab.conditions,
          [key]: value,
        },
      },
    })),
  markVerified: (key) =>
    set((state) => {
      return {
        lab: {
          ...state.lab,
          verifiedConditions: new Set([...state.lab.verifiedConditions, key]),
        },
      };
    }),
  incrementMistake: () =>
    set((state) => ({
      lab: {
        ...state.lab,
        mistakeCount: state.lab.mistakeCount + 1,
      },
    })),
  incrementNearMiss: () =>
    set((state) => ({
      lab: {
        ...state.lab,
        nearMissCount: state.lab.nearMissCount + 1,
      },
    })),
  useHint: (level) =>
    set((state) => ({
      lab: {
        ...state.lab,
        hintsUsed: state.lab.hintsUsed + 1,
        shownHintLevels: new Set([...state.lab.shownHintLevels, level]),
      },
    })),
  completeLab: () =>
    set((state) => {
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            100 -
              state.lab.mistakeCount * 8 -
              state.lab.nearMissCount * 3 -
              state.lab.hintsUsed * 10,
          ),
        ),
      );

      return {
        lab: {
          ...state.lab,
          isComplete: true,
          score,
        },
      };
    }),
  resetLab: () =>
    set((state) => ({
      topology: state.topology,
      lab: createDefaultLabState(),
      activeConceptId: state.activeConceptId,
    })),
  setActiveConceptId: (id) => set(() => ({ activeConceptId: id })),
}));
