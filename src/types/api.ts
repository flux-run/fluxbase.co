import type { Execution, ExecutionConsoleLog } from "./schema";

export * from "./schema";
export type { Member as OrgMember } from "./schema";

export interface LogEntry extends ExecutionConsoleLog {
  context?: any;
}

export interface ExecutionDetail extends Execution {
  logs?: LogEntry[];
  console_logs?: LogEntry[];
}

