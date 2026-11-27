"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson6Write({ onComplete, onPreviousLesson, hasPreviousLesson }: { onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  return <AuthoredOperationsLesson lesson="write" onComplete={onComplete} onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
