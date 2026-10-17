/**
 * CPA Platform — Shared AI Chat & MCP Types
 */

export type ChatRole = "user" | "assistant" | "system";

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  uri?: string;
}

export type ToolCallStatus = "running" | "done" | "error";

export interface ToolCallInfo {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status: ToolCallStatus;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}
