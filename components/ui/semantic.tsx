"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "semantic-ui-button-primary",
  secondary: "semantic-ui-button-secondary",
  ghost: "semantic-ui-button-ghost",
  danger: "semantic-ui-button-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={classes("semantic-ui-button", buttonVariants[variant], className)}
    />
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, type = "button", ...props },
  ref,
) {
  return <button {...props} ref={ref} type={type} className={classes("semantic-ui-icon-button", className)} />;
});

export type SurfaceVariant = "panel" | "card" | "elevated";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

const surfaceVariants: Record<SurfaceVariant, string> = {
  panel: "semantic-ui-surface-panel",
  card: "semantic-ui-surface-card",
  elevated: "semantic-ui-surface-elevated",
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { variant = "panel", className, ...props },
  ref,
) {
  return <div {...props} ref={ref} className={classes("semantic-ui-surface", surfaceVariants[variant], className)} />;
});

export interface ActionRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const ActionRow = forwardRef<HTMLButtonElement, ActionRowProps>(function ActionRow(
  { selected = false, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      data-selected={selected || undefined}
      className={classes("semantic-ui-action-row", selected && "semantic-ui-action-row-selected", className)}
    />
  );
});

export type StatusBadgeVariant = "neutral" | "success" | "error" | "warning" | "info";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
}

const statusVariants: Record<StatusBadgeVariant, string | undefined> = {
  neutral: undefined,
  success: "semantic-ui-status-success",
  error: "semantic-ui-status-error",
  warning: "semantic-ui-status-warning",
  info: "semantic-ui-status-info",
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { variant = "neutral", className, ...props },
  ref,
) {
  return (
    <span
      {...props}
      ref={ref}
      className={classes("semantic-ui-status-badge", statusVariants[variant], className)}
    />
  );
});

export type OverlayPlacement = "anchored" | "viewport";

export interface OverlaySurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Anchored overlays are absolute within their containing block; viewport overlays are fixed and centered. */
  placement: OverlayPlacement;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * Presentation and placement for popovers and dialogs. This component does not
 * create a portal or manage focus; overlay owners retain DOM and focus control.
 * Pass role/aria-modal/aria-labelledby directly when modal semantics are needed.
 */
export const OverlaySurface = forwardRef<HTMLDivElement, OverlaySurfaceProps>(function OverlaySurface(
  { placement, className, ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      className={classes(
        "semantic-ui-overlay-surface",
        placement === "viewport" ? "semantic-ui-overlay-viewport" : "semantic-ui-overlay-anchored",
        className,
      )}
    />
  );
});
