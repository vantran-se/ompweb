import type { ReactNode, RefObject } from "react";

export interface AppShellTopbarProps {
  topBarRef: RefObject<HTMLDivElement | null>;
  isPhone: boolean;
  children: ReactNode;
}

export function AppShellTopbar({ topBarRef, isPhone, children }: AppShellTopbarProps) {
  return (
    <header
      ref={topBarRef}
      className="shell-topbar"
      data-phone={isPhone ? "true" : "false"}
    >
      {children}
    </header>
  );
}
