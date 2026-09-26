import "../../tests/setup-dom.mjs";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react/pure.js";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { PanelIconAction, PanelTextAction } = await jiti.import("./PanelHeader.tsx");

afterEach(cleanup);

test("icon action exposes toggle state independently from visual activity", () => {
  const { rerender } = render(React.createElement(PanelIconAction, {
    label: "Search files",
    onClick() {},
    active: true,
  }, "S"));
  const action = screen.getByRole("button", { name: "Search files" });
  assert.match(action.className, /right-panel-action-active/);
  assert.equal(action.hasAttribute("aria-pressed"), false);

  rerender(React.createElement(PanelIconAction, {
    label: "Search files",
    onClick() {},
    pressed: false,
  }, "S"));
  assert.equal(action.getAttribute("aria-pressed"), "false");
});

test("text action keeps shorthand visible and descriptive label accessible", () => {
  render(React.createElement(PanelTextAction, {
    label: "Others",
    accessibleLabel: "Close other tabs",
    onClick() {},
  }));
  const action = screen.getByRole("button", { name: "Close other tabs" });
  assert.equal(action.textContent, "Others");
  assert.equal(action.title, "Close other tabs");
});
