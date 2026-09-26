"use client";

import type { ReactNode } from "react";
import { Folder } from "lucide-react";
import { IconButton } from "@/components/ui/semantic";
import { getFileName } from "@/lib/file-paths";

export function PanelHeader({ tabs, actions }: { tabs: ReactNode; actions?: ReactNode }) {
  return (
    <header className="right-panel-header">
      <div className="right-panel-tabs">{tabs}</div>
      {actions}
    </header>
  );
}

export function PanelActions({ label, children }: { label: string; children: ReactNode }) {
  return <div className="right-panel-actions" role="toolbar" aria-label={label}>{children}</div>;
}

export function PanelActionGroup({ children }: { children: ReactNode }) {
  return <div className="right-panel-action-group">{children}</div>;
}

interface PanelIconActionProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  pressed?: boolean;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PanelIconAction({ label, onClick, children, active = false, pressed, primary = false, disabled, className }: PanelIconActionProps) {
  const classes = ["right-panel-icon-action", active && "right-panel-action-active", primary && "right-panel-action-primary", className].filter(Boolean).join(" ");
  return (
    <IconButton className={classes} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={pressed}>
      {children}
    </IconButton>
  );
}

export function PanelTextAction({ label, accessibleLabel, onClick }: { label: string; accessibleLabel: string; onClick: () => void }) {
  return <button type="button" className="right-panel-text-action" onClick={onClick} title={accessibleLabel} aria-label={accessibleLabel}>{label}</button>;
}

export function WorkspaceContext({ root, changedCount, isRepository, changedLabel, cleanLabel }: {
  root: string;
  changedCount: number;
  isRepository: boolean;
  changedLabel: string;
  cleanLabel: string;
}) {
  return (
    <div className="right-panel-workspace" title={root}>
      <span className="right-panel-workspace-icon-frame" aria-hidden="true">
        <Folder className="right-panel-workspace-icon" size={15} strokeWidth={1.9} />
      </span>
      <span className="right-panel-workspace-text">
        <span className="right-panel-workspace-name">{getFileName(root)}</span>
        <span className="right-panel-workspace-path">{root}</span>
      </span>
      {isRepository && (
        <span className={`right-panel-repo-status${changedCount > 0 ? " is-changed" : " is-clean"}`} title={changedCount > 0 ? changedLabel : cleanLabel}>
          <span className="right-panel-repo-dot" aria-hidden="true" />
          <span className="right-panel-repo-label">{changedCount > 0 ? changedLabel : cleanLabel}</span>
        </span>
      )}
    </div>
  );
}
