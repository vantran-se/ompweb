"use client";

import { useState, type ComponentProps } from "react";
import { GitFork } from "lucide-react";
import { MarkdownBody } from "../MarkdownBody";
import { Tooltip } from "../ui/primitives";
import { translate, useI18n, type Locale } from "@/lib/i18n";
import type { ImageContent } from "@/lib/types";

const MAX_MARKDOWN_CHARS = 100_000;

export function formatMessageSize(chars: number): string {
  return chars >= 1_000_000 ? `${(chars / 1_000_000).toFixed(1)} MB` : `${Math.round(chars / 1_000)} KB`;
}

export function SafeMarkdownBody({ children, className, ...props }: ComponentProps<typeof MarkdownBody>) {
  const { t } = useI18n();
  const [showRaw, setShowRaw] = useState(false);

  if (children.length <= MAX_MARKDOWN_CHARS) {
    return <MarkdownBody className={className} {...props}>{children}</MarkdownBody>;
  }

  if (!showRaw) {
    return (
      <button
        type="button"
        onClick={() => setShowRaw(true)}
        style={{ display: "block", width: "100%", margin: "4px 0", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--bg-panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, textAlign: "left" }}
      >
        {t("messageView.largeMessageReveal", { size: formatMessageSize(children.length) })}
      </button>
    );
  }

  return (
    <div className={className} style={{ maxHeight: 420, overflow: "auto", fontSize: 12, lineHeight: 1.5 }}>
      <pre style={{ margin: 0, padding: "8px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
        {children}
      </pre>
    </div>
  );
}

export function formatTime(ts: number | undefined, locale: Locale): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  const date = d.toLocaleDateString(locale, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  return `${date} ${time}`;
}

export function imageBlockSrc(img: ImageContent): string {
  const flat = img as unknown as { data?: string; mimeType?: string };
  return img.source
    ? img.source.type === "base64"
      ? `data:${img.source.media_type};base64,${img.source.data}`
      : img.source.url ?? ""
    : flat.data
      ? `data:${flat.mimeType};base64,${flat.data}`
      : "";
}

export function ForkSessionButton({ entryId, onFork, forking }: {
  entryId: string;
  onFork: (entryId: string) => void;
  forking?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Tooltip content={forking ? t("messageView.creatingSession") : t("messageView.newSessionTitle")}>
      <button
        onClick={() => { onFork(entryId); }}
        disabled={forking}
        aria-label={forking ? t("messageView.creatingSession") : t("messageView.newSessionTitle")}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "3px 8px", height: 24, minHeight: 24,
          background: "none", border: "none",
          borderRadius: 5,
          color: forking ? "var(--accent)" : "var(--text-dim)",
          cursor: forking ? "not-allowed" : "pointer",
          fontSize: 11, fontWeight: 400,
          whiteSpace: "nowrap",
          transition: "color var(--dur-fast) var(--ease-out-warm)",
        }}
        onMouseEnter={(e) => { if (!forking) e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { if (!forking) e.currentTarget.style.color = "var(--text-dim)"; }}
      >
        <GitFork size={11} strokeWidth={1.8} />
        {forking ? t("messageView.creating") : t("messageView.newSession")}
      </button>
    </Tooltip>
  );
}

export function safeJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}
