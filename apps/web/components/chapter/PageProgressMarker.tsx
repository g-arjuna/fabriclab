"use client";

import { useEffect } from "react";

import { useProgressStore } from "@/store/progressStore";

interface Props {
  chapterSlug: string;
  pageIndex: number;
}

export function PageProgressMarker({ chapterSlug, pageIndex }: Props) {
  const markPageComplete = useProgressStore((state) => state.markPageComplete);
  const hasHydrated = useProgressStore((state) => state.hasHydrated);
  const mode = useProgressStore((state) => state.mode);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    markPageComplete(chapterSlug, pageIndex);
  }, [chapterSlug, hasHydrated, pageIndex, markPageComplete, mode]);

  return null;
}
