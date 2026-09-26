const DEFAULT_UI_SCALE = 1;

/** Read the positive UI zoom factor from the root element, falling back to 1. */
export function readUiScale(root?: Element): number {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
    return DEFAULT_UI_SCALE;
  }

  try {
    const scale = Number.parseFloat(
      getComputedStyle(root ?? document.documentElement).getPropertyValue("--ui-scale"),
    );
    return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_UI_SCALE;
  } catch {
    return DEFAULT_UI_SCALE;
  }
}

/** Convert a viewport-space measurement to zoomed layout-space pixels. */
export function viewportToLayoutPx(value: number, scale = DEFAULT_UI_SCALE): number {
  return value / scale;
}

/** Convert a zoomed layout-space measurement to viewport-space pixels. */
export function layoutToViewportPx(value: number, scale = DEFAULT_UI_SCALE): number {
  return value * scale;
}
