import { create } from "zustand";

type TopologyState = {
  pfcEnabled: boolean;
  priorities: number[];
  hasVerified: boolean;
  attempts: number;
  mistakeCount: number;
  disablePfc: () => void;
  verifyPfc: () => void;
  incrementAttempts: () => void;
  incrementMistakes: () => void;
};

export const useTopologyStore = create<TopologyState>((set) => ({
  pfcEnabled: true,
  priorities: [3, 4],
  hasVerified: false,
  attempts: 0,
  mistakeCount: 0,
  disablePfc: () => set({ pfcEnabled: false }),
  verifyPfc: () => set({ hasVerified: true }),
  incrementAttempts: () => set((state) => ({ attempts: state.attempts + 1 })),
  incrementMistakes: () =>
    set((state) => ({ mistakeCount: state.mistakeCount + 1 })),
}));
