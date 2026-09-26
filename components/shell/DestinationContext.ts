import type { ManagedProject, SessionInfo } from "@/lib/types";

export interface WorkspaceOptions {
  projects: ManagedProject[];
  selectedProject: string | null;
  cwd: string | null;
}

export type DestinationContext =
  | { kind: "session"; session: SessionInfo; cwd: string; showChat: true }
  | { kind: "new-session"; session: null; cwd: string; showChat: true }
  | { kind: "workspace"; session: null; cwd: string; showChat: true }
  | { kind: "none"; session: null; cwd: null; showChat: false };

/** Derive the active shell destination without creating a second source of truth. */
export function deriveDestinationContext(
  selectedSession: SessionInfo | null,
  newSessionCwd: string | null,
  activeCwd: string | null,
): DestinationContext {
  if (selectedSession) {
    return {
      kind: "session",
      session: selectedSession,
      cwd: selectedSession.cwd,
      showChat: true,
    };
  }
  const effectiveNewSessionCwd = newSessionCwd ?? activeCwd;
  if (effectiveNewSessionCwd) {
    return newSessionCwd !== null
      ? { kind: "new-session", session: null, cwd: effectiveNewSessionCwd, showChat: true }
      : { kind: "workspace", session: null, cwd: effectiveNewSessionCwd, showChat: true };
  }
  return { kind: "none", session: null, cwd: null, showChat: false };
}
