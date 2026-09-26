"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BashExecutionMessage, ToolCallContent, ToolResultMessage } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { ToolCallBlock } from "./ToolCall";

export function BashOutputBlock({ message, sessionId }: { message: BashExecutionMessage; sessionId?: string }) {
  const { t } = useI18n();
  const [fullOutput, setFullOutput] = useState<{ phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; output: string } | null>(null);
  // Bumped on every message change; an in-flight fetch from the previous
  // message must not write into the reused component instance.
  const fullOutputGenRef = useRef(0);
  // Branch navigation can swap a different bashExecution message into the same
  // index; the component instance is reused, so drop any loaded full output
  // (and its "ready" re-load guard) whenever the message identity changes.
  useEffect(() => {
    fullOutputGenRef.current += 1;
    setFullOutput(null);
  }, [message.command, message.fullOutputPath, message.output, message.timestamp]);
  const isPending = !message.output && message.exitCode === undefined && !message.cancelled;
  const isError = message.cancelled || (message.exitCode !== undefined && message.exitCode !== 0);

  // Reuse the existing ToolCallBlock so user-run bash looks identical to an
  // agent-run bash tool call: same header, collapse behavior, result pane.
  // Synthesize an equivalent ToolCallContent + ToolResultMessage pair.
  const toolName = message.excludeFromContext ? "bash (local)" : "bash";
  const block: ToolCallContent = {
    type: "toolCall",
    toolCallId: `bash-${message.timestamp ?? ""}`,
    toolName,
    input: { command: message.command },
  };
  const result: ToolResultMessage | undefined = isPending
    ? undefined
    : {
        role: "toolResult",
        toolCallId: block.toolCallId,
        toolName,
        content: message.output ? [{ type: "text", text: message.output }] : [],
        isError,
        timestamp: message.timestamp,
      };

  // Large executions record their full output to a temp file (fullOutputPath);
  // fetch it through the guarded bash-output route instead of re-reading the
  // truncated session payload.
  const loadFullOutput = useCallback(async () => {
    if (!message.fullOutputPath || !sessionId || fullOutput?.phase === "ready") return;
    const gen = fullOutputGenRef.current;
    setFullOutput({ phase: "loading" });
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(sessionId)}/bash-output?path=${encodeURIComponent(message.fullOutputPath)}`);
      const data = await res.json() as { success?: boolean; data?: { output?: string }; error?: string };
      if (fullOutputGenRef.current !== gen) return;
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
      setFullOutput({ phase: "ready", output: data.data?.output ?? "" });
    } catch (e) {
      if (fullOutputGenRef.current !== gen) return;
      setFullOutput({ phase: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, [message.fullOutputPath, sessionId, fullOutput?.phase]);

  const downloadUrl = message.fullOutputPath && sessionId
    ? `/api/agent/${encodeURIComponent(sessionId)}/bash-output?path=${encodeURIComponent(message.fullOutputPath)}&download=1`
    : null;

  return (
    <div data-selection-scope="message" tabIndex={-1} style={{ margin: "6px 0" }}>
      <ToolCallBlock block={block} result={result} />
      {downloadUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          {fullOutput?.phase !== "ready" && (
            <button
              type="button"
              disabled={fullOutput?.phase === "loading"}
              onClick={() => void loadFullOutput()}
              style={{ padding: 0, border: "none", background: "none", color: "var(--accent)", cursor: fullOutput?.phase === "loading" ? "default" : "pointer", fontSize: 12, opacity: fullOutput?.phase === "loading" ? 0.6 : 1, fontFamily: "inherit" }}
            >
              {fullOutput?.phase === "loading" ? t("messageView.fullOutputLoading") : t("messageView.viewFullOutput")}
            </button>
          )}
          <a href={downloadUrl} download style={{ color: "var(--text-dim)", fontSize: 12, textDecoration: "none" }}>
            {t("messageView.fullOutputDownload")}
          </a>
        </div>
      )}
      {fullOutput?.phase === "ready" && (
        <div style={{ maxHeight: 420, overflow: "auto", marginTop: 6, border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg-panel)" }}>
          <pre style={{ margin: 0, padding: "8px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            {fullOutput.output}
          </pre>
        </div>
      )}
      {fullOutput?.phase === "error" && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--status-error)" }}>{fullOutput.message}</div>
      )}
    </div>
  );
}
