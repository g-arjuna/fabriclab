"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson4Queues({ onComplete, onPreviousLesson, hasPreviousLesson }: { onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  return <AuthoredFoundationsLesson lesson="queues" onComplete={onComplete} onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
