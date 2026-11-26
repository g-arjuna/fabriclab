"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson6Write({ onComplete }: { onComplete: () => void }) {
  return <AuthoredOperationsLesson lesson="write" onComplete={onComplete} />;
}
