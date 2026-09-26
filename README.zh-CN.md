# ompweb

[![GitHub release](https://img.shields.io/github/v/release/vantran-se/ompweb?logo=github)](https://github.com/vantran-se/ompweb/releases)
[![license](https://img.shields.io/github/license/vantran-se/ompweb.svg?color=44cc11)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vantran-se/ompweb.svg?logo=github)](https://github.com/vantran-se/ompweb/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vantran-se/ompweb/pulls)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

社区：[加入 OMPWEB Discord](https://discord.gg/evqgGzRfM5)

[oh-my-pi (omp)](https://github.com/can1357/oh-my-pi) 编程智能体的现代 Web UI。它读取本地 omp 会话，在浏览器中提供实时对话、项目浏览、配置管理和文件预览。

![ompweb — 演示](docs/demo.gif)

## 环境要求

- 已安装 [omp](https://github.com/can1357/oh-my-pi) 且在 `PATH` 中（或通过 `OMP_WEB_OMP_BIN` 指定）
- Node.js 26 或更高版本
- Linux/macOS 需要 `curl` 和 `tar`；Windows 需要 PowerShell 7

## 安装与更新

ompweb 仅通过 [vantran-se/ompweb GitHub Releases](https://github.com/vantran-se/ompweb/releases) 分发构建产物。`@vantran-se/ompweb` 只是包元数据名称，不会发布到 npm。

Linux/macOS：

```bash
curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh
ompweb
```

Windows (PowerShell 7)：

```powershell
irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1 | iex
ompweb
```

再次运行相同命令即可更新。Linux/macOS 卸载命令为
`curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh -s -- --uninstall`；Windows 卸载命令为
`$i = [scriptblock]::Create((irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1)); & $i --uninstall`。

安装程序下载 `ompweb-v<version>.tar.gz` 和 `SHA256SUMS`，在解压前严格验证 SHA-256，并拒绝危险路径和符号链接。它在同一文件系统上暂存版本，原子切换 `current`，并保留上一版本用于回滚。

Linux/macOS 默认根目录为 `${XDG_DATA_HOME:-$HOME/.local/share}/ompweb`，版本位于 `releases/v<version>`，启动包装器位于 `${XDG_BIN_HOME:-$HOME/.local/bin}/ompweb`。可用 `OMPWEB_INSTALL_ROOT` 修改根目录。更新或卸载不会删除 `~/.omp/agent` 中的 OMP 配置、凭据和会话。

Linux systemd 用户服务与 macOS launchd 用户代理会在登录时启动、故障后重启，并通过稳定包装器继续使用更新后的版本。Windows 可用 `ompweb --install-tray` 安装登录自启、系统托盘和桌面/开始菜单快捷方式；卸载 ompweb 前运行 `ompweb --uninstall-tray`。

应用内“更新并重启”同样从 GitHub Releases 获取版本。它验证并暂存产物，停止由 ompweb 管理的会话，原子切换版本并重启服务或进程。如果新服务器未恢复健康，则还原并重启上一版本。服务配置、密码和浏览器会话都会保留。

在浏览器中打开 [http://127.0.0.1:30177](http://127.0.0.1:30177)。

## 功能特性

- **实时对话**：与本地 `omp` 智能体进行低延迟流式交互。
- **队列删除确认**：从队列面板移除后续消息或引导消息前，先预览内容并确认。此操作不会取消 OMP 内部已排队消息的发送。
- **会话管理**：按项目浏览历史会话，支持会话分叉与分支回溯。
- **草稿恢复**：未发送的文本按会话或新会话的工作区分别保存；浏览器存储可用时，在同一标签页后退、前进或重新加载后可恢复（最多 50 份草稿）。图片和文件附件仅保留在内存中。
- **实时任务与子智能体**：可折叠面板实时展示任务清单（todo）与子智能体进度，并支持查看完整转录。
- **文件管理与预览**：与对话并排浏览文件，支持代码、Markdown、图片、音频及 PDF 预览。
- **Git Worktree 支持**：直接在侧边栏切换与管理 Git 工作树。
- **可视化设置**：在 Web 界面中直接配置模型、API 密钥、MCP 服务器、技能、插件及 OMP 原生设置。
- **快捷指令与命令面板**：内置常用指令（`/plan`、`/review`、`/fix`、`/test` 等）及 `⌘K` / `Ctrl+K` 全局面板。
- **主题与多语言**：温暖纸感深浅主题，完整支持英语、简体中文及日本語。

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 服务端口 | `30177` |
| `OMP_WEB_HOSTNAME` | 绑定主机名 | `127.0.0.1` |
| `OMP_WEB_PASSWORD` | 可选的 Web 访问密码 | _无（未启用验证）_ |
| `OMP_WEB_NO_OPEN` | 设为 `1` 时禁止自动打开浏览器 | `0` |
| `OMP_WEB_DISABLE_AUTOUPDATE` | 设为 `1` 时禁用更新检查和应用内更新；修改后需重启 | `0` |
| `OMP_WEB_OMP_BIN` | `omp` 二进制路径（未在 PATH 时使用） | _自动检测_ |
| `PI_CODING_AGENT_DIR` | 自定义 omp agent 目录 | `~/.omp/agent` |
| `OMP_WEB_STT_ENDPOINT` | OpenAI 兼容的语音转文字接口 URL | _无（默认禁用）_ |
| `OMP_WEB_STT_KEY` | STT 接口对应的 API Key | _无_ |
| `OMP_WEB_STT_MODEL` | STT 接口的模型名称 | _无_ |

## 本地开发

```bash
git clone https://github.com/vantran-se/ompweb.git
cd ompweb
npm install
npm run dev
```

本地开发服务器运行在 [http://127.0.0.1:30178](http://127.0.0.1:30178)。

### 代码检查

```bash
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint 检查
npm test            # 运行测试套件
```

> **注意**：本地开发期间请勿运行 `npm run build`，以免污染 `.next/` 导致开发服务器异常。

## 致谢与许可证

- 分叉自 [agegr/pi-web](https://github.com/agegr/pi-web)（MIT），针对 [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) 进行适配。
- 采用 [MIT 许可证](./LICENSE) 开源。
