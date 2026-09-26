"use client";

import { memo } from "react";
import type { AgentMessage, AssistantMessage as AssistantMessageType, BashExecutionMessage, CustomMessage as CustomMessageType, ToolResultMessage, UserMessage as UserMessageType } from "@/lib/types";
import { UserMessage } from "./message/UserMessage";
import { AssistantMessage, isInterruptedMessage } from "./message/AssistantMessage";
import { BashOutputBlock } from "./message/BashOutputBlock";
import { CompactionMessage, CustomMessage, HiddenExtensionMessage } from "./message/CustomMessage";

export { SafeMarkdownBody } from "./message/shared";
export { TaskResultPanel } from "./MessageView-task-panel";
export { isInterruptedMessage } from "./message/AssistantMessage";
export { UserMessage } from "./message/UserMessage";
export { AssistantMessage } from "./message/AssistantMessage";
export { ToolCallBlock, ToolCallGroup } from "./message/ToolCall";
export { ThinkingBlock } from "./message/ThinkingBlock";
export { BashOutputBlock } from "./message/BashOutputBlock";

interface Props {
  message: AgentMessage;
  isStreaming?: boolean;
  toolResults?: Map<string, ToolResultMessage>;
  modelNames?: Record<string, string>;
  cwd?: string;
  onOpenFile?: (filePath: string) => void;
  entryId?: string;
  /** Entry omp's `branch` command accepts for this message (a user entry, #103). */
  forkEntryId?: string;
  onFork?: (entryId: string) => void;
  forking?: boolean;
  onNavigate?: (entryId: string) => boolean | Promise<boolean>;
  prevAssistantEntryId?: string;
  onEditContent?: (content: string) => void;
  showTimestamp?: boolean;
  prevTimestamp?: number;
  sessionId?: string;
  toolCallsDefaultCollapsed?: boolean;
  /** omp-reported output throughput (get_state.tokensPerSecond), live while streaming. */
  liveTokensPerSecond?: number | null;
}

function haveSameRelevantToolResults(message: AgentMessage, previous: Map<string, ToolResultMessage> | undefined, next: Map<string, ToolResultMessage> | undefined): boolean {
  if (previous === next || message.role !== "assistant") return true;
  for (const block of (message as AssistantMessageType).content ?? []) {
    if (block.type === "toolCall" && previous?.get(block.toolCallId) !== next?.get(block.toolCallId)) return false;
  }
  return true;
}

export const MessageView = memo(function MessageView({ message, isStreaming, toolResults, modelNames, cwd, onOpenFile, entryId, forkEntryId, onFork, forking, onNavigate, prevAssistantEntryId, onEditContent, showTimestamp, prevTimestamp, sessionId, toolCallsDefaultCollapsed = true, liveTokensPerSecond }: Props) {
  if (message.role === "user") return <UserMessage message={message as UserMessageType} cwd={cwd} onOpenFile={onOpenFile} entryId={entryId} onFork={onFork} forking={forking} onNavigate={onNavigate} prevAssistantEntryId={prevAssistantEntryId} onEditContent={onEditContent} />;
  if (message.role === "assistant") return <AssistantMessage message={message as AssistantMessageType} isStreaming={isStreaming} toolResults={toolResults} modelNames={modelNames} cwd={cwd} onOpenFile={onOpenFile} showTimestamp={showTimestamp} prevTimestamp={prevTimestamp} sessionId={sessionId} entryId={entryId} forkEntryId={forkEntryId} onFork={onFork} forking={forking} toolCallsDefaultCollapsed={toolCallsDefaultCollapsed} liveTokensPerSecond={liveTokensPerSecond} />;
  if (message.role === "toolResult") return null;
  if (message.role === "custom") {
    const custom = message as CustomMessageType;
    if (custom.customType === "xdev-mount-notice") return null;
    if (custom.customType === "compaction") return <CompactionMessage message={custom} />;
    if (custom.display === false) return <HiddenExtensionMessage message={custom} cwd={cwd} onOpenFile={onOpenFile} />;
    return <CustomMessage message={custom} cwd={cwd} onOpenFile={onOpenFile} />;
  }
  if (message.role === "bashExecution") return <BashOutputBlock message={message as BashExecutionMessage} sessionId={sessionId} />;
  return null;
}, (prev, next) => prev.message === next.message
  && prev.isStreaming === next.isStreaming
  && haveSameRelevantToolResults(prev.message, prev.toolResults, next.toolResults)
  && prev.modelNames === next.modelNames
  && prev.cwd === next.cwd
  && prev.onOpenFile === next.onOpenFile
  && prev.entryId === next.entryId
  && prev.forkEntryId === next.forkEntryId
  && prev.onFork === next.onFork
  && prev.forking === next.forking
  && prev.onNavigate === next.onNavigate
  && prev.prevAssistantEntryId === next.prevAssistantEntryId
  && prev.onEditContent === next.onEditContent
  && prev.showTimestamp === next.showTimestamp
  && prev.prevTimestamp === next.prevTimestamp
  && prev.sessionId === next.sessionId
  && prev.toolCallsDefaultCollapsed === next.toolCallsDefaultCollapsed
  && (!prev.isStreaming || prev.liveTokensPerSecond === next.liveTokensPerSecond));
