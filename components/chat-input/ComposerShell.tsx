"use client";

import React from "react";

export function ComposerShell({ attachedRail, bashMode, running, children }: { attachedRail: boolean; bashMode: boolean; running: boolean; children: React.ReactNode }) {
  return (
    <div className="chat-input-shell" data-attached-rail={attachedRail || undefined} data-bash-mode={bashMode || undefined} data-running={running || undefined}>
      {children}
    </div>
  );
}

export function ComposerToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="composer-toolbar">
      {children}
    </div>
  );
}

export function MenuSurface({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={["picker-panel", props.className].filter(Boolean).join(" ")}>{children}</div>;
}
