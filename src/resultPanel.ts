import * as vscode from "vscode";

let currentPanel: vscode.WebviewPanel | undefined;

function getOrCreatePanel (
  context: vscode.ExtensionContext,
  title: string,
): vscode.WebviewPanel {
  if (currentPanel) {
    currentPanel.title = title;
    currentPanel.reveal(vscode.ViewColumn.Beside, true);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      "acidAiResult",
      title,
      {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
      }
    );

    currentPanel.webview.html = getHtml(currentPanel.webview, context, '');

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  }

  return currentPanel;
}

export function showLoading(
  context: vscode.ExtensionContext,
  title: string,
) : void {
  getOrCreatePanel(context, title).webview.postMessage({ type: "prepare" });
}

export function showResult(
  context: vscode.ExtensionContext,
  title: string,
  markdownContent: string,
  selection: {content: string, language?: string}
): void {
  getOrCreatePanel(context, title).webview.postMessage({ type: "update", content: markdownContent, title, selection});
}

function getHtml(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  initialContent: string
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "webview.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "webview.css")
  );

  // Pass initial content via a data attribute (avoids inline <script> entirely).
  // main.ts reads this from the DOM on startup.
  const escapedContent = initialContent
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

  // No nonce needed: there is no inline script left to authorize.
  // script-src/style-src are scoped to this webview's own resource origin.
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource}`,
  ].join("; ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="content" data-initial-content="${escapedContent}"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}
