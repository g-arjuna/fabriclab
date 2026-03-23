import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ProgressState {
  completedPages: Record<string, number[]>;
  completedLabs: Record<
    string,
    {
      completedAt: number;
      score: number;
      attempts: number;
    }
  >;
  markPageComplete: (chapterSlug: string, pageIndex: number) => void;
  markLabComplete: (labId: string, score: number) => void;
  isPageComplete: (chapterSlug: string, pageIndex: number) => boolean;
  isLabComplete: (labId: string) => boolean;
  getChapterProgress: (chapterSlug: string, totalPages: number) => number;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedPages: {},
      completedLabs: {},

      markPageComplete: (chapterSlug, pageIndex) =>
        set((state) => {
          const existing = state.completedPages[chapterSlug] ?? [];
          if (existing.includes(pageIndex)) {
            return state;
          }

          return {
            completedPages: {
              ...state.completedPages,
              [chapterSlug]: [...existing, pageIndex].sort((a, b) => a - b),
            },
          };
        }),

      markLabComplete: (labId, score) =>
        set((state) => {
          const existing = state.completedLabs[labId];
          return {
            completedLabs: {
              ...state.completedLabs,
              [labId]: {
                completedAt: Date.now(),
                score,
                attempts: (existing?.attempts ?? 0) + 1,
              },
            },
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

      resetProgress: () =>
        set({
          completedPages: {},
          completedLabs: {},
        }),
    }),
    {
      name: "fabriclab-progress",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
