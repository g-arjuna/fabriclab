"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson8Packets({ onComplete, onPreviousLesson, hasPreviousLesson }: { onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  return <AuthoredOperationsLesson lesson="packets" onComplete={onComplete} onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
