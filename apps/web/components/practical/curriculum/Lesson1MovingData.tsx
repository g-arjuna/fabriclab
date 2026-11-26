"use client";

import { AuthoredFoundationsLesson } from "./AuthoredFoundationsLesson";

export function Lesson1MovingData({ onComplete }: { onComplete: () => void }) {
  return <AuthoredFoundationsLesson lesson="moving-data" onComplete={onComplete} />;
}
