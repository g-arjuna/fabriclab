"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson3Memory({ onComplete }: { onComplete: () => void }) {
  return <AuthoredFoundationsLesson lesson="memory" onComplete={onComplete} />;
}
