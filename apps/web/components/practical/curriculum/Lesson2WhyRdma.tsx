"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson2WhyRdma({ onComplete }: { onComplete: () => void }) {
  return <AuthoredFoundationsLesson lesson="why-rdma" onComplete={onComplete} />;
}
