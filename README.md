# Acid AI

Apply configurable style guides to selected code using Claude, with results rendered side-by-side.

## Setup

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host with this extension loaded.

## Usage

1. **Set your API key**: Command Palette → `Acid AI: Set Anthropic API Key`
2. **Create a style guide**: Command Palette → `Acid AI: New Style Guide`
   (creates a `.md` file under `.vscode/style-guides/` in your workspace)
3. **Apply it**: select code → right-click → `Acid AI: Apply Style Guide to Selection` → pick a guide
4. Result opens in a panel beside your editor, rendered as markdown with syntax-highlighted code.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `acidAi.model` | `claude-sonnet-4-6` | Model used for requests |
| `acidAi.styleGuidesPath` | `.vscode/style-guides` | Folder with style guide `.md` files |
| `acidAi.maxTokens` | `4096` | Max output tokens |

## Packaging

```bash
npm run package
```

Produces a `.vsix` you can install via `code --install-extension acid-ai-0.0.1.vsix`.
