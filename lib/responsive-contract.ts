/** Inclusive viewport width used by the phone layout. */
export const PHONE_MAX_PX = 640;

/** Inclusive viewport width where side panels become overlays. */
export const COMPACT_OVERLAY_MAX_PX = 1100;

/** Media query matching the phone layout contract. */
export const PHONE_QUERY = `(max-width: ${PHONE_MAX_PX}px)`;

/** Media query matching the compact overlay contract. */
export const COMPACT_OVERLAY_QUERY = `(max-width: ${COMPACT_OVERLAY_MAX_PX}px)`;

export function isPhoneWidth(width: number): boolean {
  return width <= PHONE_MAX_PX;
}

export function usesCompactOverlay(width: number): boolean {
  return width <= COMPACT_OVERLAY_MAX_PX;
}
