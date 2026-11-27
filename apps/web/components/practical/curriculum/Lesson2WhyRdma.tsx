"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson2WhyRdma({ onComplete, onPreviousLesson, hasPreviousLesson }: { onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  return <AuthoredFoundationsLesson lesson="why-rdma" onComplete={onComplete} onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
