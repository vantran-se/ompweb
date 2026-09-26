import "../tests/setup-dom.mjs";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react/pure.js";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { ProjectRow } = await jiti.import("./SessionSidebar-rows.tsx");

const noop = () => {};

afterEach(cleanup);

test("workspace plus starts a new session in that workspace", () => {
  const createdIn = [];
  const project = { path: "/home/louis/workspace", alias: "workspace" };

  render(React.createElement(ProjectRow, {
    project,
    isActive: false,
    isExpanded: false,
    activity: undefined,
    tree: [],
    hiddenCount: 0,
    selectedSessionId: null,
    runningSessionIds: new Set(),
    unreadSessionIds: new Set(),
    relativeTimeNow: Date.now(),
    onActivate: noop,
    onNewSession: (path) => createdIn.push(path),
    onToggleExpand: noop,
    onRemoveProject: noop,
    onEditLaunchConfig: noop,
    onUpdatePresentation: noop,
    onDragPathChange: noop,
    onDropProject: noop,
    onMoveProject: noop,
    isDragTarget: false,
    removeBusy: false,
    onSelectSession: noop,
    homeDir: "/home/louis",
  }));

  fireEvent.click(screen.getByRole("button", { name: "New session in workspace" }));

  assert.deepEqual(createdIn, [project.path]);
});
