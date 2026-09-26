"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type KeyboardEvent, type MouseEvent, type RefObject, type SetStateAction } from "react";
import { readUiScale, viewportToLayoutPx } from "@/lib/ui-geometry";

export interface PanelResizeOptions {
  elementRef: RefObject<HTMLElement | null>;
  cssVariable: `--${string}`;
  storageKey: string;
  initialWidth: number | null;
  loadWidth: () => number | null;
  clampWidth: (width: number) => number;
  defaultWidth: number | null;
  minimumWidth: number;
  disabled?: boolean;
  /** 1 for a handle on the panel's right edge, -1 for its left edge. */
  direction?: 1 | -1;
}

export interface PanelResizeResult {
  width: number | null;
  resizing: boolean;
  setWidth: Dispatch<SetStateAction<number | null>>;
  resetWidth: () => void;
  resizeBy: (delta: number) => void;
  onResizeStart: (event: MouseEvent) => void;
  onResizeKey: (event: KeyboardEvent) => void;
}

type ActiveHandlers = { onMove: (event: globalThis.MouseEvent) => void; onUp: () => void };

/**
 * Resizable panel state with a direct-DOM pointer hot path. Pointer movement
 * updates only the panel CSS variable; React state and storage are committed
 * once on pointer-up. Keyboard resizing remains state-driven and accessible.
 */
export function usePanelResize({
  elementRef,
  cssVariable,
  storageKey,
  initialWidth,
  loadWidth,
  clampWidth,
  defaultWidth,
  minimumWidth,
  disabled = false,
  direction = 1,
}: PanelResizeOptions): PanelResizeResult {
  const [width, setWidth] = useState<number | null>(initialWidth);
  const [resizing, setResizing] = useState(false);
  const pendingWidthRef = useRef<number | null>(initialWidth);
  const activeHandlersRef = useRef<ActiveHandlers | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const loaded = loadWidth();
    pendingWidthRef.current = loaded;
    setWidth(loaded);
  }, [loadWidth]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (resizing) return;
    try {
      if (width === null) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, String(width));
    } catch {
      // Storage may be unavailable in privacy mode or at quota.
    }
  }, [resizing, storageKey, width]);

  const resetWidth = useCallback(() => {
    if (defaultWidth === null) elementRef.current?.style.removeProperty(cssVariable);
    else elementRef.current?.style.setProperty(cssVariable, `${defaultWidth}px`);
    pendingWidthRef.current = defaultWidth;
    setWidth(defaultWidth);
  }, [cssVariable, defaultWidth, elementRef]);

  const resizeBy = useCallback((delta: number) => {
    setWidth((current) => {
      let base = current;
      if (base === null) {
        const scale = readUiScale();
        const measuredWidth = elementRef.current?.getBoundingClientRect().width;
        base = measuredWidth === undefined ? minimumWidth : viewportToLayoutPx(measuredWidth, scale);
      }
      const next = clampWidth(base + delta);
      elementRef.current?.style.setProperty(cssVariable, `${next}px`);
      pendingWidthRef.current = next;
      return next;
    });
  }, [clampWidth, cssVariable, elementRef, minimumWidth]);

  const onResizeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeBy(direction === 1 ? -10 : 10);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeBy(direction === 1 ? 10 : -10);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      resetWidth();
    }
  }, [direction, resetWidth, resizeBy]);

  const onResizeStart = useCallback((event: MouseEvent) => {
    if (disabled) return;
    event.preventDefault();
    const startX = event.clientX;
    const scale = readUiScale();
    const measuredWidth = elementRef.current?.getBoundingClientRect().width;
    const startWidth = width ?? (measuredWidth === undefined ? minimumWidth : viewportToLayoutPx(measuredWidth, scale));
    pendingWidthRef.current = startWidth;
    setResizing(true);

    const onMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = viewportToLayoutPx(moveEvent.clientX - startX, scale) * direction;
      const next = clampWidth(startWidth + delta);
      elementRef.current?.style.setProperty(cssVariable, `${next}px`);
      pendingWidthRef.current = next;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      activeHandlersRef.current = null;
      setResizing(false);
      setWidth(pendingWidthRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    activeHandlersRef.current = { onMove, onUp };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [clampWidth, cssVariable, direction, disabled, elementRef, minimumWidth, width]);

  useEffect(() => () => {
    const handlers = activeHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("mousemove", handlers.onMove);
    window.removeEventListener("mouseup", handlers.onUp);
    activeHandlersRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return { width, resizing, setWidth, resetWidth, resizeBy, onResizeStart, onResizeKey };
}
