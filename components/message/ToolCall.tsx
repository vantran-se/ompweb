"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, CircleAlert, CircleSlash, LoaderCircle, FileText, Search, FileEdit, Terminal, CheckSquare, Bot, Code2, Globe, MessagesSquare, Wrench } from "lucide-react";
import { ClickableImage } from "../ImageLightbox";
import { TaskResultPanel } from "../MessageView-task-panel";
import { HubResultPanel } from "../MessageView-hub-panel";
import { getResultDiff, PairedDiffResult, PairedResult } from "../MessageView-diff-view";
import { Collapsible, CollapsibleTrigger } from "../ui/primitives";
import { useI18n } from "@/lib/i18n";
import type { ImageContent, ToolCallContent, ToolResultMessage } from "@/lib/types";
import { formatToolCommand, formatToolOutput, getHubJobs, getHubJobsHeader, getHubSendSummary, getSemanticToolLabel, getTodoSummary, getToolCategory, getToolPreview, getToolResultMeta, summarizeToolCallGroup, type ToolCategory } from "../MessageView-tool-format";
import { imageBlockSrc, safeJson } from "./shared";

function ToolCategoryIcon({
  category,
  size = 12,
  className,
  style,
}: {
  category: ToolCategory;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  switch (category) {
    case "read":
      return <FileText size={size} strokeWidth={1.8} className={className} style={{ color: "var(--status-renamed, #7CA8FF)", ...style }} />;
    case "search":
      return <Search size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent, #EC5BAB)", ...style }} />;
    case "edit":
      return <FileEdit size={size} strokeWidth={1.8} className={className} style={{ color: "var(--status-modified, #E0B24D)", ...style }} />;
    case "terminal":
      return <Terminal size={size} strokeWidth={1.8} className={className} style={{ color: "var(--status-success, #7DD8A8)", ...style }} />;
    case "todo":
      return <CheckSquare size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent, #EC5BAB)", ...style }} />;
    case "task":
      return <Bot size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent-2, #7DD7E8)", ...style }} />;
    case "hub":
      return <MessagesSquare size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent-2, #7DD7E8)", ...style }} />;
    case "code":
      return <Code2 size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent, #EC5BAB)", ...style }} />;
    case "web":
      return <Globe size={size} strokeWidth={1.8} className={className} style={{ color: "var(--accent-2, #7DD7E8)", ...style }} />;
    default:
      return <Wrench size={size} strokeWidth={1.8} className={className} style={{ color: "var(--text-muted)", ...style }} />;
  }
}

function inputsShallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

export const ToolCallBlock = memo(function ToolCallBlock({
  block,
  result,
  duration,
  isStreaming,
  defaultCollapsed = true,
  inGroup = false,
  onOpenFile,
}: {
  block: ToolCallContent;
  result?: ToolResultMessage;
  duration?: number;
  isStreaming?: boolean;
  defaultCollapsed?: boolean;
  cwd?: string;
  inGroup?: boolean;
  onOpenFile?: (filePath: string) => void;
}) {
  const { t } = useI18n();
  // `partial` results are omp's live snapshots for a tool that is still
  // executing (see lib/types.ts); the committed toolResult replaces them.
  const isRunning = result?.partial === true;
  // A running tool opens its row when the interface keeps tool calls expanded
  // ("Keep tool calls collapsed" off) so its output is watchable live.
  const [expanded, setExpanded] = useState(Boolean(isStreaming || isRunning) && !defaultCollapsed);
  const [inputExpanded, setInputExpanded] = useState(false);
  const inputId = useId();
  // The row can also mount while the tool is idle and start running later (the
  // assistant message commits before `tool_execution_start`). It is never
  // auto-collapsed: the output stays where the user was reading it.
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (isRunning && !wasRunningRef.current && !defaultCollapsed) setExpanded(true);
    wasRunningRef.current = isRunning;
  }, [isRunning, defaultCollapsed]);
  const resultText = result
    ? (typeof result.content === "string"
        ? result.content
        : (Array.isArray(result.content) ? result.content : [])
            .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("\n"))
    : null;
  const resultImages = result && Array.isArray(result.content)
    ? result.content.filter((b): b is ImageContent => b.type === "image")
    : [];
  const resultIsEmpty = resultText === null ? false : (resultText.trim() === "(no output)" || resultText.trim() === "");
  const isError = result?.isError ?? false;
  const resultDiff = expanded && result && !isError ? getResultDiff(result) : null;
  const resultMeta = getToolResultMeta(result);
  const command = formatToolCommand(block);
  const category = getToolCategory(block.toolName);
  const semantic = getSemanticToolLabel(block);
  const todoSummary = category === "todo" ? getTodoSummary(block.input) : null;
  const preview = getToolPreview(block);
  // Outgoing steering (`hub` op send) and the job roster (`hub` op jobs) get
  // the TUI's row titles: `IRC → X injected` and `waiting on N jobs`.
  const hubSend = category === "hub" ? getHubSendSummary(block.input) : null;
  const hubJobs = category === "hub" ? getHubJobs(result?.details) : null;
  const hubReceiptOutcome = (() => {
    const receipts = (result?.details as { receipts?: Array<{ outcome?: unknown }> } | undefined)?.receipts;
    if (!Array.isArray(receipts) || receipts.length === 0) return null;
    const outcomes = receipts.map((receipt) => (typeof receipt?.outcome === "string" ? receipt.outcome : null));
    if (outcomes.some((outcome) => outcome === null || outcome !== outcomes[0])) return null;
    return outcomes[0];
  })();
  const hubTool = hubSend
    ? `IRC → ${hubSend.to.join(", ")}${hubReceiptOutcome ? ` ${hubReceiptOutcome}` : ""}`
    : hubJobs
      ? getHubJobsHeader(hubJobs)
      : null;
  const hubPreview = hubSend
    ? (hubSend.snippet || hubSend.to.join(", "))
    : hubJobs
      ? hubJobs.map((job) => job.label).join(" · ")
      : null;

  const cleanFilePath = semantic.isFile && typeof block.input === "object" && block.input && "path" in block.input
    ? String((block.input as Record<string, unknown>).path).split(":")[0]
    : null;

  return (
    <div className={inGroup ? "activity-group-item" : "activity-row"} data-activity-operation="true">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className={inGroup ? "activity-group-item-trigger" : "activity-row-trigger"}>
          <span className={`activity-row-indicator${isError ? " activity-row-indicator-error" : ""}`} aria-hidden>
            {isError ? (
              <CircleAlert size={12} strokeWidth={1.8} />
            ) : result && !isRunning ? (
              <Check size={12} strokeWidth={2} />
            ) : isRunning || isStreaming ? (
              <LoaderCircle size={12} strokeWidth={1.8} className="activity-row-spinner" />
            ) : (
              <CircleSlash size={12} strokeWidth={1.8} style={{ opacity: 0.5 }} />
            )}
          </span>
          <span className="activity-tool-icon" aria-hidden>
            <ToolCategoryIcon category={category} size={12} />
          </span>
          <span className={`activity-row-tool${isError ? " activity-row-tool-error" : ""}`}>{hubTool ?? block.toolName}</span>
          <span className="activity-row-preview">
            {cleanFilePath && onOpenFile ? (
              <span
                role="button"
                tabIndex={0}
                className="activity-file-link"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFile(cleanFilePath);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onOpenFile(cleanFilePath);
                  }
                }}
                title={hubPreview ?? preview}
              >
                {hubPreview ?? preview}
              </span>
            ) : (
              hubPreview ?? preview
            )}
          </span>
          {duration !== undefined && (
            <span className="activity-row-duration">{t("messageView.durationSeconds", { seconds: duration })}</span>
          )}
          <ChevronDown
            size={12}
            strokeWidth={1.8}
            aria-hidden
            style={{
              flexShrink: 0,
              transform: expanded ? "none" : "rotate(-90deg)",
              transition: "transform var(--dur-fast) var(--ease-out-warm)",
            }}
          />
        </CollapsibleTrigger>
        {resultMeta && <div className="activity-row-secondary">{resultMeta}</div>}
        {expanded && (
          <div className={`tool-call-details${isError ? " tool-call-details-error" : ""}`}>
            <div className="tool-call-command">
              <span className="tool-call-command-prompt" aria-hidden>$</span>
              <code>{command}</code>
              <button
                type="button"
                className="tool-call-input-toggle"
                aria-expanded={inputExpanded}
                aria-controls={inputId}
                onClick={() => setInputExpanded((value) => !value)}
              >
                {t(inputExpanded ? "messageView.collapseInput" : "messageView.showFullInput")}
              </button>
            </div>
            <div id={inputId} hidden={!inputExpanded} className="tool-call-input">
              {inputExpanded && (
                block.input && typeof block.input === "object" && !Array.isArray(block.input) && Object.keys(block.input).length > 0 ? (
                  <dl>
                    {Object.entries(block.input).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key === "i" ? "intent" : key}</dt>
                        <dd><pre>{typeof value === "string" ? value : safeJson(value)}</pre></dd>
                      </div>
                    ))}
                  </dl>
                ) : <pre>{safeJson(block.input)}</pre>
              )}
            </div>
            {todoSummary && (
              <div className="tool-call-todo-badge">
                <span className={`todo-op-tag todo-op-${todoSummary.op}`}>
                  {todoSummary.action}
                </span>
                <span className="todo-task-name">{todoSummary.task ?? todoSummary.label}</span>
              </div>
            )}
            <TaskResultPanel details={result?.details} />
            <HubResultPanel input={block.input} result={result} />
            {isRunning && (resultText ?? "").trim() === "" ? (
              // No output yet: say so instead of the "(no output)" marker that
              // would claim the tool finished with nothing.
              <div data-tool-running="true" className="tool-call-running-status">
                {t("chatWindow.runningTool")}
              </div>
            ) : result ? (
              resultDiff ? (
                <PairedDiffResult diff={resultDiff} />
              ) : (
                <>
                  {resultImages.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {resultImages.map((img, i) => (
                        <ClickableImage
                          key={i}
                          src={imageBlockSrc(img)}
                          alt=""
                          style={{ maxWidth: 240, maxHeight: 240, borderRadius: 6, objectFit: "contain", display: "block", border: "1px solid color-mix(in srgb, var(--accent) 18%, transparent)" }}
                        />
                      ))}
                    </div>
                  )}
                  {!(hubJobs || (hubSend && !isError)) && !(resultIsEmpty && resultImages.length > 0) && (
                    <PairedResult text={formatToolOutput(resultText ?? "", block.toolName)} isEmpty={resultIsEmpty} isError={isError} />
                  )}
                </>
              )
            ) : null}
          </div>
        )}
      </Collapsible>
    </div>
  );
}, (prev, next) => (
  prev.block.toolCallId === next.block.toolCallId
  && prev.block.toolName === next.block.toolName
  && inputsShallowEqual(prev.block.input, next.block.input)
  && prev.result === next.result
  && prev.duration === next.duration
  && prev.defaultCollapsed === next.defaultCollapsed
  && prev.inGroup === next.inGroup
  && prev.onOpenFile === next.onOpenFile
));

export const ToolCallGroup = memo(function ToolCallGroup({
  items,
  toolResults,
  isStreaming,
  toolCallDurations,
  onOpenFile,
  toolCallsDefaultCollapsed,
}: {
  items: Array<{ block: ToolCallContent; originalIndex: number }>;
  toolResults?: Map<string, ToolResultMessage>;
  isStreaming?: boolean;
  toolCallDurations?: Map<string, number>;
  onOpenFile?: (filePath: string) => void;
  toolCallsDefaultCollapsed: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(!toolCallsDefaultCollapsed);
  const blocks = items.map((i) => i.block);
  const groupSummary = useMemo(() => summarizeToolCallGroup(blocks), [blocks]);

  const hasError = blocks.some((b) => toolResults?.get(b.toolCallId)?.isError);
  // A partial snapshot is a tool still executing, not a settled result.
  const isPending = isStreaming && blocks.some((b) => {
    const result = toolResults?.get(b.toolCallId);
    return !result || result.partial === true;
  });

  const totalDuration = useMemo(() => {
    if (!toolCallDurations) return undefined;
    let sum = 0;
    let counted = 0;
    for (const b of blocks) {
      const d = toolCallDurations.get(b.toolCallId);
      if (d !== undefined) {
        sum += d;
        counted++;
      }
    }
    return counted > 0 ? sum : undefined;
  }, [blocks, toolCallDurations]);

  return (
    <div className="activity-group" data-activity-operation="true">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="activity-group-header">
          <span className="activity-group-icon-cluster" aria-hidden>
            {groupSummary.categories.slice(0, 3).map((cat) => (
              <ToolCategoryIcon key={cat} category={cat} size={12} />
            ))}
          </span>
          <span className="activity-group-summary">
            {groupSummary.summaryText}
          </span>
          {totalDuration !== undefined && (
            <span className="activity-row-duration">
              {t("messageView.durationSeconds", { seconds: totalDuration })}
            </span>
          )}
          <span className={`activity-row-indicator${hasError ? " activity-row-indicator-error" : ""}`} aria-hidden>
            {hasError ? (
              <CircleAlert size={12} strokeWidth={1.8} />
            ) : isPending ? (
              <LoaderCircle size={12} strokeWidth={1.8} className="activity-row-spinner" />
            ) : (
              <Check size={12} strokeWidth={2} />
            )}
          </span>
          <ChevronDown
            size={12}
            strokeWidth={1.8}
            aria-hidden
            style={{
              flexShrink: 0,
              transform: expanded ? "none" : "rotate(-90deg)",
              transition: "transform var(--dur-fast) var(--ease-out-warm)",
            }}
          />
        </CollapsibleTrigger>
        {expanded && (
          <div className="activity-group-body">
            {items.map(({ block }) => {
              const result = toolResults?.get(block.toolCallId);
              const duration = toolCallDurations?.get(block.toolCallId);
              return (
                <ToolCallBlock
                  key={block.toolCallId}
                  block={block}
                  result={result}
                  duration={duration}
                  isStreaming={isStreaming}
                  defaultCollapsed={true}
                  inGroup={true}
                  onOpenFile={onOpenFile}
                />
              );
            })}
          </div>
        )}
      </Collapsible>
    </div>
  );
}, (prev, next) => (
  prev.items.length === next.items.length
  && prev.items.every((item, i) => (
    item.block.toolCallId === next.items[i]?.block.toolCallId
    && item.block.toolName === next.items[i]?.block.toolName
    && inputsShallowEqual(item.block.input, next.items[i]?.block.input)
  ))
  && prev.onOpenFile === next.onOpenFile
  && (!prev.toolResults || !next.toolResults || prev.items.every((item) => prev.toolResults?.get(item.block.toolCallId) === next.toolResults?.get(item.block.toolCallId)))
));
