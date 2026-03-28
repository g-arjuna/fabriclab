import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type CompletedLabRecord = Record<
  string,
  {
    completedAt: number;
    score: number;
    attempts: number;
  }
>;

type ProgressSnapshot = {
  completedPages: Record<string, number[]>;
  completedLabs: CompletedLabRecord;
};

interface ProgressState {
  completedPages: Record<string, number[]>;
  completedLabs: CompletedLabRecord;
  guestSnapshot: ProgressSnapshot;
  mode: "guest" | "remote";
  markPageComplete: (chapterSlug: string, pageIndex: number) => void;
  markLabComplete: (labId: string, score: number) => void;
  isPageComplete: (chapterSlug: string, pageIndex: number) => boolean;
  isLabComplete: (labId: string) => boolean;
  getChapterProgress: (chapterSlug: string, totalPages: number) => number;
  hydrateRemoteProgress: (snapshot: ProgressSnapshot) => void;
  switchToGuestMode: () => void;
  resetProgress: () => void;
}

function emptySnapshot(): ProgressSnapshot {
  return {
    completedPages: {},
    completedLabs: {},
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedPages: {},
      completedLabs: {},
      guestSnapshot: emptySnapshot(),
      mode: "guest",

      markPageComplete: (chapterSlug, pageIndex) =>
        set((state) => {
          const existing = state.completedPages[chapterSlug] ?? [];
          if (existing.includes(pageIndex)) {
            return state;
          }

          const nextCompletedPages = {
            ...state.completedPages,
            [chapterSlug]: [...existing, pageIndex].sort((a, b) => a - b),
          };

          return {
            completedPages: nextCompletedPages,
            guestSnapshot:
              state.mode === "guest"
                ? {
                    ...state.guestSnapshot,
                    completedPages: nextCompletedPages,
                  }
                : state.guestSnapshot,
          };
        }),

      markLabComplete: (labId, score) =>
        set((state) => {
          const existing = state.completedLabs[labId];
          const nextCompletedLabs = {
            ...state.completedLabs,
            [labId]: {
              completedAt: Date.now(),
              score,
              attempts: (existing?.attempts ?? 0) + 1,
            },
          };

          return {
            completedLabs: nextCompletedLabs,
            guestSnapshot:
              state.mode === "guest"
                ? {
                    ...state.guestSnapshot,
                    completedLabs: nextCompletedLabs,
                  }
                : state.guestSnapshot,
          };
        }),

      isPageComplete: (chapterSlug, pageIndex) => {
        const pages = get().completedPages[chapterSlug] ?? [];
        return pages.includes(pageIndex);
      },

      isLabComplete: (labId) => {
        return !!get().completedLabs[labId];
      },

      getChapterProgress: (chapterSlug, totalPages) => {
        const completed = get().completedPages[chapterSlug] ?? [];
        if (totalPages === 0) {
          return 0;
        }

        return Math.round((completed.length / totalPages) * 100);
      },

      hydrateRemoteProgress: (snapshot) =>
        set((state) => ({
          completedPages: snapshot.completedPages,
          completedLabs: snapshot.completedLabs,
          guestSnapshot:
            state.mode === "guest"
              ? {
                  completedPages: state.completedPages,
                  completedLabs: state.completedLabs,
                }
              : state.guestSnapshot,
          mode: "remote",
        })),

      switchToGuestMode: () =>
        set((state) => ({
          completedPages: state.guestSnapshot.completedPages,
          completedLabs: state.guestSnapshot.completedLabs,
          mode: "guest",
        })),

      resetProgress: () =>
        set((state) => {
          const snapshot = emptySnapshot();
          if (state.mode === "guest") {
            return {
              completedPages: {},
              completedLabs: {},
              guestSnapshot: snapshot,
            };
          }

          return {
            completedPages: {},
            completedLabs: {},
          };
        }),
    }),
    {
      name: "fabriclab-progress",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const typedPersisted = (persistedState ?? {}) as Partial<ProgressState>;
        const completedPages = typedPersisted.completedPages ?? currentState.completedPages;
        const completedLabs = typedPersisted.completedLabs ?? currentState.completedLabs;

        return {
          ...currentState,
          ...typedPersisted,
          completedPages,
          completedLabs,
          guestSnapshot: typedPersisted.guestSnapshot ?? {
            completedPages,
            completedLabs,
          },
          mode: typedPersisted.mode ?? "guest",
        };
      },
    },
  ),
);
