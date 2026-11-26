"use client";

import { AuthoredOperationsLesson } from "./operationsShared";

export function Lesson5SendReceive({ onComplete }: { onComplete: () => void }) {
  return <AuthoredOperationsLesson lesson="send-receive" onComplete={onComplete} />;
}
