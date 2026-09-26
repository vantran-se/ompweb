import "../tests/setup-dom.mjs";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react/pure.js";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { ProjectRow, SessionItem } = await jiti.import("./SessionSidebar-rows.tsx");

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

test("workspace remove action opens its confirmation dialog", () => {
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
    onNewSession: noop,
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

  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Remove project workspace" }));

  assert.ok(screen.getByRole("dialog"));
  assert.ok(screen.getByRole("button", { name: "Remove" }));
});

test("session delete action opens its confirmation dialog", () => {
  const session = {
    id: "session-1",
    name: "Test session",
    firstMessage: "",
    cwd: "/home/louis/workspace",
    modified: Date.now(),
  };

  render(React.createElement(SessionItem, {
    session,
    isSelected: false,
    isRunning: false,
    isUnread: false,
    onClick: noop,
    onRenamed: noop,
    onDeleted: noop,
    relativeTimeNow: Date.now(),
  }));

  fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

  assert.ok(screen.getByRole("dialog"));
  assert.ok(screen.getByRole("button", { name: "Delete" }));
});
