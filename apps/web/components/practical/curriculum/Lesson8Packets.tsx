"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson8Packets({ onComplete }: { onComplete: () => void }) {
  return <AuthoredOperationsLesson lesson="packets" onComplete={onComplete} />;
}
