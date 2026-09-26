# ompweb

[![GitHub release](https://img.shields.io/github/v/release/vantran-se/ompweb?logo=github)](https://github.com/vantran-se/ompweb/releases)
[![license](https://img.shields.io/github/license/vantran-se/ompweb.svg?color=44cc11)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vantran-se/ompweb.svg?logo=github)](https://github.com/vantran-se/ompweb/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vantran-se/ompweb/pulls)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

Community: [Join the OMPWEB Discord](https://discord.gg/evqgGzRfM5)

A clean, modern web UI for the [oh-my-pi (omp)](https://github.com/can1357/oh-my-pi) coding agent. It reads your local omp sessions and gives you a browser workspace to chat with the agent, browse projects, manage settings, and preview files.

![ompweb — live session demo](docs/demo.gif)

<details>
<summary>Screenshots (light / dark)</summary>

![ompweb — light theme](docs/screenshot-light.png)

![ompweb — dark theme](docs/screenshot-dark.png)

</details>

## Requirements

- [omp](https://github.com/can1357/oh-my-pi) installed and available on your `PATH` (or specified via `OMP_WEB_OMP_BIN`)
- Node.js 26 or newer
- `curl` and `tar` on Linux/macOS, or PowerShell 7 on Windows

## Install

ompweb is distributed exclusively as checksum-verified build artifacts from
[GitHub Releases](https://github.com/vantran-se/ompweb/releases). The package
name `@vantran-se/ompweb` is metadata only; it is not published to npm.

### Linux and macOS

```bash
curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh
ompweb
```

Update to the latest release by running the same installer. Remove the app and
its release files with:

```bash
curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh -s -- --uninstall
```

### Windows (PowerShell 7)

```powershell
irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1 | iex
ompweb
```

Run the same command to update. To uninstall:

```powershell
$i = [scriptblock]::Create((irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1)); & $i --uninstall
```

The installer fetches `ompweb-v<version>.tar.gz` and `SHA256SUMS`, verifies the
exact SHA-256 before extraction, rejects unsafe archive paths and symlinks, and
runs `npm ci --omit=dev` in a private staged release. It then atomically switches
`current` to the new version. The previous release is retained for rollback.

### Install layout and services

On Linux/macOS, the default root is
`${XDG_DATA_HOME:-$HOME/.local/share}/ompweb`; releases are stored under
`releases/v<version>`, `current` points at the active release, and the
`${XDG_BIN_HOME:-$HOME/.local/bin}/ompweb` wrapper launches it with Node. Set
`OMPWEB_INSTALL_ROOT` to use another root. OMP sessions, credentials, and app
configuration remain in `~/.omp/agent` and are not removed by uninstall.

Linux service commands install a systemd **user** unit; macOS service commands
install a launchd user agent. Both start at login, restart after failure, and
continue through upgrades because they invoke the stable wrapper. Windows can
install the existing System Tray manager with `ompweb --install-tray`; it adds
login autostart and Desktop/Start Menu shortcuts. Remove it first with
`ompweb --uninstall-tray` when uninstalling ompweb.

The in-app **Update and restart** action also uses GitHub Releases. It downloads
and verifies the release and checksum, stages it on the installation filesystem,
stops ompweb-managed sessions, switches releases atomically, and restarts the
configured service or process. If the new server does not become healthy, the
updater restores the previous release and restarts it. OMP state, passwords,
service configuration, and browser sessions are preserved.

Open [http://127.0.0.1:30177](http://127.0.0.1:30177) in your browser.

### CLI Options

```bash
ompweb --port 8080                         # Custom port
ompweb --hostname 0.0.0.0                  # Listen on network
ompweb --password "your-password"          # Enable password protection
ompweb --no-open                           # Don't auto-open the browser
ompweb --install-tray                      # Install Windows tray service
ompweb --uninstall-tray                    # Remove Windows tray service
ompweb --tray                              # Start Windows tray manager
ompweb systemd install                     # Install Linux systemd user service
ompweb --help
ompweb --version
```

When binding to a non-loopback host, require authentication and HTTPS through a
trusted reverse proxy or VPN. Never expose the unauthenticated UI or send its
password/session cookie over plaintext HTTP.
### Linux System Tray (KDE Plasma and compatible)

`ompweb-tray` registers a StatusNotifierItem menu for opening the UI and
controlling the systemd user service. After installation, use:

```bash
ompweb-tray --install
ompweb-tray --status
ompweb-tray --uninstall
```

Network exposure requires a web password and HTTPS through a trusted reverse
proxy or VPN. Tray service settings remain in `~/.omp/agent/web-service.env`.

## Features

- **Interactive Chat**: Real-time streaming conversation with your local `omp` agent — tool calls, thinking levels, token counts, cost, context gauge, queue controls, and interrupt & retry.
- **Message Copy**: Copy user messages and completed assistant replies as rendered plain text or original Markdown using the buttons below each message. Thinking, tool output, and message controls are excluded. Oversized messages that use the raw-text viewer copy their full source in either format.
- **Queue Deletion Confirmation**: Preview and confirm before removing queued follow-ups or steered messages from the queue panel. This does not cancel delivery already queued inside OMP.
- **Session Management**: Browse past conversations by project, fork sessions, branch within a session, archive/restore, import session files, and deep-link via URL.
- **Draft Recovery**: Unsent text stays scoped to its conversation or new-session workspace and is restored after Back/Forward navigation or reload in the same tab when browser storage is available (up to 50 drafts). Images and file attachments remain in memory only.
- **Live Plans & Subagents**: Collapsible panels pinned above the composer track live todo phases and running subagents (status, tool, retries, tokens/cost, nested tasks) with transcript dialogs and history recovery.
- **Tool Preset Picker**: Choose the toolset for new sessions in the composer — `none` / `default` (`read,bash,edit,write`) / `full` (all tools including subagents). Persists to localStorage.
- **File Explorer & Previews**: Browse workspaces side-by-side with chat; preview code, markdown, Mermaid, images, audio, PDFs, and diffs with allow-listed access.
- **Git Worktree Support**: Create, switch, and manage Git worktrees directly from the sidebar; sessions and file roots stay grouped by project.
- **Usage & Analytics**: Dashboard in **Settings → Usage** for tokens, costs, cache savings, and breakdowns by provider / model / day / project with SQLite persistence.
- **Windows System Tray & Service**: Background service, tray icon, logon autostart, and Desktop/Start Menu shortcuts (Windows).
- **macOS launchd Service**: LaunchAgent that starts at login, restarts on crash, and logs under `~/Library/Logs/ompweb`.
- **Linux systemd Service & Tray**: User service that starts at login and restarts on crash, plus a StatusNotifierItem tray icon with service controls (KDE Plasma and compatible desktops).
- **Web-based Settings** (8 tabs): Interface & Behavior, Safety & Approvals, AI Model Defaults, API Keys & Providers, Usage, Agent & Intelligence (advisor, memory, compaction), Agents, Extensions & Tools (MCP, skills, plugins), System & Updates.
- **Slash Commands & Shortcuts**: Quick prompts (`/plan`, `/review`, `/fix`, `/test`, etc.), `⌘K` / `Ctrl+K` palette, and model/reasoning cycling.
- **UI Themes & Localization**: Warm paper light/dark themes plus an omp.sh-inspired midnight (`omp`) theme, chat font size & interface scale, with full English, Chinese (简体中文), and Japanese (日本語) translations.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Server port | `30177` |
| `OMP_WEB_HOSTNAME` | Server bind host | `127.0.0.1` |
| `OMP_WEB_PASSWORD` | Optional password for web login | _None (auth disabled)_ |
| `OMP_WEB_NO_OPEN` | Set to `1` to prevent auto-opening browser | `0` |
| `OMP_WEB_DISABLE_AUTOUPDATE` | Set to `1` to disable update checks and in-app updates; restart after changing | `0` |
| `OMP_WEB_OMP_BIN` | Path to `omp` binary if not on `PATH` | _auto-detected_ |
| `PI_CODING_AGENT_DIR` | Custom omp agent directory | `~/.omp/agent` |
| `OMP_WEB_STT_ENDPOINT` | OpenAI-compatible transcription endpoint URL | _None (disabled)_ |
| `OMP_WEB_STT_KEY` | Optional API key for the STT endpoint | _None_ |
| `OMP_WEB_STT_MODEL` | Optional model name for the STT endpoint | _None_ |

## Development

```bash
git clone https://github.com/vantran-se/ompweb.git
cd ompweb
npm install
npm run dev
```

The dev server runs at [http://127.0.0.1:30178](http://127.0.0.1:30178).

### Checks

```bash
npm run typecheck   # Type check (TypeScript)
npm run lint        # ESLint
npm test            # Run test suite
```

> **Note**: Do not run `npm run build` during local dev — it populates `.next/` and can break `npm run dev`.

## License & Credits

- Forked from [agegr/pi-web](https://github.com/agegr/pi-web) (MIT) and adapted for [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi).
- Released under the [MIT License](./LICENSE).
