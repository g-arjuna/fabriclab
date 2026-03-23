"use client";

import { useEffect } from "react";

import { useProgressStore } from "@/store/progressStore";

interface Props {
  chapterSlug: string;
  pageIndex: number;
}

export function PageProgressMarker({ chapterSlug, pageIndex }: Props) {
  const markPageComplete = useProgressStore((state) => state.markPageComplete);

  useEffect(() => {
    markPageComplete(chapterSlug, pageIndex);
  }, [chapterSlug, pageIndex, markPageComplete]);

  return null;
}
