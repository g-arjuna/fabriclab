import type { CommandResult } from "@/types";
import { runNcclTests } from "@/lib/commands/runNcclTests";

export function ncclDebugTransport(): CommandResult {
  return runNcclTests();
}
