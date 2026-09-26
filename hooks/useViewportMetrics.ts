"use client";

import { useLayoutEffect } from "react";
import { readUiScale, viewportToLayoutPx } from "@/lib/ui-geometry";
import { UI_SCALE_CHANGE_EVENT } from "@/hooks/useUiScale";

const WIDTH_VARIABLE = "--viewport-width";
const HEIGHT_VARIABLE = "--viewport-height";
const VISUAL_WIDTH_VARIABLE = "--visual-viewport-width";
const VISUAL_HEIGHT_VARIABLE = "--visual-viewport-height";

/**
 * Owns viewport CSS metrics without routing resize traffic through React.
 * Values are layout-space pixels so they remain useful under root UI zoom.
 */
export function useViewportMetrics(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const writeMetrics = () => {
      frame = 0;
      const scale = readUiScale(root);
      const visual = window.visualViewport;
      root.style.setProperty(WIDTH_VARIABLE, `${viewportToLayoutPx(window.innerWidth, scale)}px`);
      root.style.setProperty(HEIGHT_VARIABLE, `${viewportToLayoutPx(window.innerHeight, scale)}px`);
      root.style.setProperty(VISUAL_WIDTH_VARIABLE, `${viewportToLayoutPx(visual?.width ?? window.innerWidth, scale)}px`);
      root.style.setProperty(VISUAL_HEIGHT_VARIABLE, `${viewportToLayoutPx(visual?.height ?? window.innerHeight, scale)}px`);
    };
    const scheduleWrite = () => {
      if (!frame) frame = window.requestAnimationFrame(writeMetrics);
    };

    writeMetrics();
    window.addEventListener("resize", scheduleWrite, { passive: true });
    window.addEventListener(UI_SCALE_CHANGE_EVENT, writeMetrics);
    window.visualViewport?.addEventListener("resize", scheduleWrite, { passive: true });
    window.visualViewport?.addEventListener("scroll", scheduleWrite, { passive: true });
    return () => {
      window.removeEventListener("resize", scheduleWrite);
      window.removeEventListener(UI_SCALE_CHANGE_EVENT, writeMetrics);
      window.visualViewport?.removeEventListener("resize", scheduleWrite);
      window.visualViewport?.removeEventListener("scroll", scheduleWrite);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty(WIDTH_VARIABLE);
      root.style.removeProperty(HEIGHT_VARIABLE);
      root.style.removeProperty(VISUAL_WIDTH_VARIABLE);
      root.style.removeProperty(VISUAL_HEIGHT_VARIABLE);
    };
  }, []);
}
