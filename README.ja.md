# ompweb

[![GitHub release](https://img.shields.io/github/v/release/vantran-se/ompweb?logo=github)](https://github.com/vantran-se/ompweb/releases)
[![license](https://img.shields.io/github/license/vantran-se/ompweb.svg?color=44cc11)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vantran-se/ompweb.svg?logo=github)](https://github.com/vantran-se/ompweb/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vantran-se/ompweb/pulls)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md)

コミュニティ：[OMPWEB Discord に参加](https://discord.gg/evqgGzRfM5)

[oh-my-pi (omp)](https://github.com/can1357/oh-my-pi) コーディングエージェント向けのモダンな Web UI です。ローカルの omp セッションを読み込み、ブラウザから対話、プロジェクト閲覧、設定管理、ファイルプレビューを行えます。

![ompweb — デモ](docs/demo.gif)

## 必要条件

- `PATH` 上の [omp](https://github.com/can1357/oh-my-pi)（または `OMP_WEB_OMP_BIN` で指定）
- Node.js 26 以降
- Linux/macOS は `curl` と `tar`、Windows は PowerShell 7

## インストールと更新

ompweb は [vantran-se/ompweb の GitHub Releases](https://github.com/vantran-se/ompweb/releases) のビルド済み成果物だけで配布します。`@vantran-se/ompweb` はメタデータ上の名前であり、npm には公開しません。

Linux/macOS:

```bash
curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh
ompweb
```

Windows (PowerShell 7):

```powershell
irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1 | iex
ompweb
```

同じコマンドで最新版へ更新できます。アンインストールは Linux/macOS で
`curl -fsSL https://github.com/vantran-se/ompweb/releases/latest/download/install.sh | sh -s -- --uninstall`、Windows で
`$i = [scriptblock]::Create((irm https://github.com/vantran-se/ompweb/releases/latest/download/install.ps1)); & $i --uninstall` を実行します。

インストーラーは `ompweb-v<version>.tar.gz` と `SHA256SUMS` を取得し、展開前に正確な SHA-256 を検証します。危険なパスやシンボリックリンクを拒否し、同一ファイルシステム上でステージして `current` をアトミックに切り替え、ロールバック用に前バージョンを保持します。

Linux/macOS の既定ルートは `${XDG_DATA_HOME:-$HOME/.local/share}/ompweb`、バージョンは `releases/v<version>`、起動ラッパーは `${XDG_BIN_HOME:-$HOME/.local/bin}/ompweb` です。`OMPWEB_INSTALL_ROOT` で変更できます。`~/.omp/agent` の OMP 設定、認証情報、セッションは更新・削除されません。

Linux の systemd ユーザーサービスと macOS の launchd ユーザーエージェントはログイン時に起動し、障害時に再起動し、安定したラッパー経由で更新後も動作します。Windows は `ompweb --install-tray` でログイン時自動起動、トレイ、デスクトップ/スタートメニューのショートカットを設定し、削除前に `ompweb --uninstall-tray` で解除します。

アプリ内の「更新して再起動」も GitHub Releases を参照します。成果物を検証してステージし、管理中のセッションを停止してアトミックに切り替え、サービスまたはプロセスを再起動します。新サーバーが正常にならない場合は前バージョンを復元します。サービス設定、パスワード、ブラウザーセッションは保持されます。

[http://127.0.0.1:30177](http://127.0.0.1:30177) を開いてください。

## 主な機能

- **リアルタイムチャット**: ローカルの `omp` エージェントとストリーミング対話。
- **キュー削除の確認**: キュー内のフォローアップやステアメッセージをパネルから削除する前に、内容を表示して確認します。OMP 内部ですでにキューに入ったメッセージの配信は取り消しません。
- **セッション管理**: プロジェクトごとに履歴を一覧表示、分岐やフォークにも対応。
- **下書きの復元**: 未送信のテキストを会話または新規セッションのワークスペースごとに保存し、ブラウザストレージが利用可能な場合は、同じタブでの「戻る」「進む」や再読み込み後に復元します（最大 50 件）。画像と添付ファイルはメモリ内にのみ保持されます。
- **ライブタスク＆サブエージェント**: Todo リストと稼働中サブエージェントの進捗を折りたたみパネルでリアルタイム表示。
- **ファイル閲覧・プレビュー**: チャットと並べてファイルを閲覧、コード・Markdown・画像・音声・PDF をプレビュー。
- **Git Worktree サポート**: サイドバーから直接 Git ワークツリーを切り替え・管理。
- **GUI 設定管理**: 設定ファイルを直接編集することなく、モデル、API キー、MCP サーバー、スキル、プラグイン、OMP 設定を変更可能。
- **スラッシュコマンド・ショートカット**: `/plan`、`/review`、`/fix`、`/test` などの定型プロンプトと `⌘K` / `Ctrl+K` コマンドパレット。
- **テーマと多言語対応**: ペーパー調のライト/ダークテーマ、英語・簡体字中国語・日本語に完全対応。

## 環境変数

| 変数名 | 説明 | デフォルト値 |
| --- | --- | --- |
| `PORT` | サーバーポート | `30177` |
| `OMP_WEB_HOSTNAME` | バインドホスト | `127.0.0.1` |
| `OMP_WEB_PASSWORD` | Web ログイン用パスワード | _なし（認証無効）_ |
| `OMP_WEB_NO_OPEN` | `1` でブラウザ自動起動を無効化 | `0` |
| `OMP_WEB_DISABLE_AUTOUPDATE` | `1` で更新チェックとアプリ内更新を無効化（変更後は再起動） | `0` |
| `OMP_WEB_OMP_BIN` | `omp` の絶対パス（PATH 未登録時） | _自動検出_ |
| `PI_CODING_AGENT_DIR` | カスタム omp エージェントディレクトリ | `~/.omp/agent` |
| `OMP_WEB_STT_ENDPOINT` | OpenAI 互換の音声認識エンドポイント URL | _なし（無効）_ |
| `OMP_WEB_STT_KEY` | STT エンドポイント用の API キー | _なし_ |
| `OMP_WEB_STT_MODEL` | STT エンドポイント用のモデル名 | _なし_ |

## 開発

```bash
git clone https://github.com/vantran-se/ompweb.git
cd ompweb
npm install
npm run dev
```

ローカル開発サーバーは [http://127.0.0.1:30178](http://127.0.0.1:30178) で起動します。

### チェックコマンド

```bash
npm run typecheck   # 型チェック (TypeScript)
npm run lint        # ESLint
npm test            # テスト実行
```

> **注意**: ローカル開発中に `npm run build` を実行しないでください（`.next/` が生成され `npm run dev` に影響を与える恐れがあります）。

## クレジットとライセンス

- [agegr/pi-web](https://github.com/agegr/pi-web) (MIT) をベースに [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) 向けに適合・拡張したフォークです。
- [MIT ライセンス](./LICENSE) のもとで公開されています。
