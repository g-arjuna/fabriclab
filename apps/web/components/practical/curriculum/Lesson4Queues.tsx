"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson4Queues({ onComplete }: { onComplete: () => void }) {
  return <AuthoredFoundationsLesson lesson="queues" onComplete={onComplete} />;
}
