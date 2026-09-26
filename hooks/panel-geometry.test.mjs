import "../tests/setup-dom.mjs";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react/pure.js";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { usePanelResize } = await jiti.import("./usePanelResize.ts");
const { useViewportMetrics } = await jiti.import("./useViewportMetrics.ts");
const { UI_SCALE_CHANGE_EVENT } = await jiti.import("./useUiScale.ts");

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-ui-scale");
  document.documentElement.style.removeProperty("--ui-scale");
});

test("panel resize converts its initial viewport width to layout pixels", () => {
  document.documentElement.style.setProperty("--ui-scale", "1.2");
  const styleWrites = [];
  const element = {
    getBoundingClientRect: () => ({ width: 480 }),
    style: { setProperty: (name, value) => styleWrites.push([name, value]), removeProperty() {} },
  };
  const { result } = renderHook(() => usePanelResize({
    elementRef: { current: element },
    cssVariable: "--right-panel-width",
    storageKey: "test-panel-width",
    initialWidth: null,
    loadWidth: () => null,
    clampWidth: (width) => width,
    defaultWidth: null,
    minimumWidth: 200,
  }));

  act(() => result.current.resizeBy(10));
  assert.deepEqual(styleWrites.at(-1), ["--right-panel-width", "410px"]);
});

test("pointer resize uses one scaled baseline without a first-move jump", () => {
  document.documentElement.style.setProperty("--ui-scale", "1.2");
  const styleWrites = [];
  const element = {
    getBoundingClientRect: () => ({ width: 480 }),
    style: { setProperty: (name, value) => styleWrites.push([name, value]), removeProperty() {} },
  };
  const { result } = renderHook(() => usePanelResize({
    elementRef: { current: element },
    cssVariable: "--right-panel-width",
    storageKey: "test-pointer-panel-width",
    initialWidth: null,
    loadWidth: () => null,
    clampWidth: (width) => width,
    defaultWidth: null,
    minimumWidth: 200,
  }));

  act(() => result.current.onResizeStart({ clientX: 100, preventDefault() {} }));
  act(() => window.dispatchEvent(new window.MouseEvent("mousemove", { clientX: 112 })));
  assert.deepEqual(styleWrites.at(-1), ["--right-panel-width", "410px"]);
  act(() => window.dispatchEvent(new window.MouseEvent("mouseup")));
});

test("viewport metrics refresh synchronously when UI scale changes", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 720 });
  document.documentElement.style.setProperty("--ui-scale", "1");
  const { unmount } = renderHook(() => useViewportMetrics());
  assert.equal(document.documentElement.style.getPropertyValue("--viewport-width"), "1200px");

  document.documentElement.style.setProperty("--ui-scale", "1.2");
  act(() => window.dispatchEvent(new CustomEvent(UI_SCALE_CHANGE_EVENT)));
  assert.equal(document.documentElement.style.getPropertyValue("--viewport-width"), "1000px");
  assert.equal(document.documentElement.style.getPropertyValue("--viewport-height"), "600px");

  unmount();
  act(() => window.dispatchEvent(new CustomEvent(UI_SCALE_CHANGE_EVENT)));
  assert.equal(document.documentElement.style.getPropertyValue("--viewport-width"), "");
});
