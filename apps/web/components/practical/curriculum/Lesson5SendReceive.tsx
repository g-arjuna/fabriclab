"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson5SendReceive({ onComplete, onPreviousLesson, hasPreviousLesson }: { onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  return <AuthoredOperationsLesson lesson="send-receive" onComplete={onComplete} onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
