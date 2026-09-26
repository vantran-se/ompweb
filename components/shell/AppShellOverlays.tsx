import type { ReactNode } from "react";

export interface AppShellOverlaysProps {
  children: ReactNode;
}

/** Keeps shell-level overlay ordering explicit without owning focus behavior. */
export function AppShellOverlays({ children }: AppShellOverlaysProps) {
  return <>{children}</>;
}
