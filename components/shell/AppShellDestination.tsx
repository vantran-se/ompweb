import type { ReactNode } from "react";
import type { DestinationContext } from "./DestinationContext";

export interface AppShellDestinationProps {
  context: DestinationContext;
  chat: ReactNode;
  fallback: ReactNode;
}

/** Selects the destination surface while preserving the caller-owned chat node identity. */
export function AppShellDestination({ context, chat, fallback }: AppShellDestinationProps) {
  return (
    <div className="shell-destination" data-destination={context.kind}>
      {context.showChat ? chat : fallback}
    </div>
  );
}
