"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { QueuedMessages } from "@/hooks/useAgentSession";
import { QueuedActionButton } from "../ChatInput-banners";

type QueueEntry = {
  id: string;
  text: string;
  attachments: unknown[];
  kind: "follow-up" | "steer";
};

interface ActiveRunRailProps {
  statusText?: string | null;
  queuedMessages?: QueuedMessages | null;
  bashMode: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onEdit: (entry: QueueEntry) => void;
  onDelete: (entry: QueueEntry) => void;
  onSteer: (entry: QueueEntry) => void;
}

function QueueActions({ entry, onEdit, onDelete, onSteer }: { entry: QueueEntry; onEdit: (entry: QueueEntry) => void; onDelete: (entry: QueueEntry) => void; onSteer: (entry: QueueEntry) => void }) {
  const { t } = useI18n();
  return (
    <>
      <QueuedActionButton onClick={() => onEdit(entry)} title={t("chatInput.queuedEditTitle")}>{t("chatInput.queuedEdit")}</QueuedActionButton>
      <QueuedActionButton onClick={() => onDelete(entry)} title={t("chatInput.queuedDeleteTitle")}>{t("chatInput.queuedDelete")}</QueuedActionButton>
      {entry.kind === "follow-up" && <QueuedActionButton onClick={() => onSteer(entry)} title={t("chatInput.queuedSteerTitle")} accent>{t("chatInput.queuedSteerAction")}</QueuedActionButton>}
    </>
  );
}

export function ActiveRunRail({ statusText, queuedMessages, bashMode, expanded, onExpandedChange, onEdit, onDelete, onSteer }: ActiveRunRailProps) {
  const { t } = useI18n();
  const entries: QueueEntry[] = [
    ...(queuedMessages?.followUp ?? []).map((entry) => ({ kind: "follow-up" as const, ...entry })),
    ...(queuedMessages?.steering ?? []).map((entry) => ({ kind: "steer" as const, ...entry })),
  ];
  const first = entries[0] ?? null;
  if (!statusText && entries.length === 0) return null;

  const queueSummary = first ? (first.text || t("chatInput.attachFile")) : null;
  return (
    <div
      className="active-run-rail"
      data-bash-mode={bashMode || undefined}
      aria-label={entries.length ? t("chatInput.queuedPrompts") : undefined}
    >
      <div className="active-run-summary">
        {statusText && (
          <div role="status" aria-live="polite" className="active-run-status">
            <span aria-hidden className="active-run-dot" />
            <span className="active-run-status-text">{statusText}</span>
          </div>
        )}
        {entries.length > 0 && (
          <div className="active-run-queue-summary">
            {entries.length > 1 ? (
              <button type="button" onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} aria-label={expanded ? t("chatInput.collapseQueued") : t("chatInput.expandQueued")} title={expanded ? t("chatInput.collapseQueued") : t("chatInput.expandQueued")} className="active-run-expand">
                <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                <span className="active-run-label">{t("chatInput.queuedPrompts")}</span>
                <span className="active-run-count">{entries.length}</span>
                {!expanded && <span className="active-run-preview">{queueSummary}</span>}
              </button>
            ) : first && (
              <>
                <span className="active-run-label">{first.kind === "steer" ? t("chatInput.queuedSteer") : t("chatInput.queuedFollowUp")}</span>
                <span title={first.text} className="active-run-preview">{queueSummary}</span>
                {first.attachments.length > 0 && <span title={t("chatInput.queuedImages", { count: first.attachments.length })} className="active-run-attachment-count">+{first.attachments.length} img</span>}
                <div className="active-run-actions"><QueueActions entry={first} onEdit={onEdit} onDelete={onDelete} onSteer={onSteer} /></div>
              </>
            )}
          </div>
        )}
      </div>
      {entries.length > 1 && expanded && (
        <div className="active-run-list">
          {entries.map((entry) => (
            <div key={entry.id} className="active-run-entry">
              <span className="active-run-kind" data-kind={entry.kind}>{entry.kind === "steer" ? t("chatInput.queuedSteer") : t("chatInput.queuedFollowUp")}</span>
              <span title={entry.text} className="active-run-entry-text">{entry.text || t("chatInput.attachFile")}</span>
              {entry.attachments.length > 0 && <span title={t("chatInput.queuedImages", { count: entry.attachments.length })} className="active-run-attachment-count">+{entry.attachments.length} img</span>}
              <div className="active-run-actions"><QueueActions entry={entry} onEdit={onEdit} onDelete={onDelete} onSteer={onSteer} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
