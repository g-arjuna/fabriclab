"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson7Read({ onComplete }: { onComplete: () => void }) {
  return <AuthoredOperationsLesson lesson="read" onComplete={onComplete} />;
}
