import * as vscode from "vscode";

let currentPanel: vscode.WebviewPanel | undefined;

export function showResult(
  context: vscode.ExtensionContext,
  title: string,
  markdownContent: string
): void {

  if (currentPanel) {
    currentPanel.title = title;
    currentPanel.webview.postMessage({ type: "update", content: markdownContent });
    currentPanel.reveal(vscode.ViewColumn.Beside, true);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    "acidAiResult",
    title,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true }
  );

  currentPanel.webview.html = getHtml(currentPanel.webview, context, markdownContent);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  initialContent: string
): string {
  const nonce = String(Date.now());

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https:; script-src 'nonce-${nonce}' https:;" />
<style>
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
    padding: 16px 20px;
    line-height: 1.5;
  }
  pre {
    background: var(--vscode-textCodeBlock-background);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  code { font-family: var(--vscode-editor-font-family); }
  pre code { background: none; }
  h1, h2, h3 { font-weight: 600; }
  #content { white-space: normal; }
</style>
<link rel="stylesheet" href="media/github-dark.min.css">
</head>
<body>
<div id="content">Loading...</div>

<script nonce="${nonce}" src="media/markdown-it.min.js"></script>
<script nonce="${nonce}" src="media/highlight.min.js"></script>
<script nonce="${nonce}">
  const md = window.markdownit({
    highlight: function (str, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(str, { language: lang }).value;
        }
      } catch (e) {}
      return hljs.highlightAuto(str).value;
    }
  });

  function render(text) {
    document.getElementById('content').innerHTML = md.render(text);
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'update') {
      render(msg.content);
    }
  });

  render(${JSON.stringify(initialContent)});
</script>
</body>
</html>`;
}
