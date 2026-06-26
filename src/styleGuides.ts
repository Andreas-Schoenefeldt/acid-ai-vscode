import * as vscode from "vscode";
import * as path from "path";

export interface StyleGuide {
  name: string;
  uri: vscode.Uri;
  content: string;
}

function getStyleGuidesFolder(): string {
  return vscode.workspace
    .getConfiguration("acidAi")
    .get<string>("styleGuidesPath", ".vscode/acid-ai-style-guides");
}

export async function listStyleGuides(): Promise<StyleGuide[]> {
  const folder = getStyleGuidesFolder();
  const pattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders?.[0] ?? "",
    `${folder}/*.md`
  );

  const files = await vscode.workspace.findFiles(pattern);
  const guides: StyleGuide[] = [];

  for (const uri of files) {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(bytes).toString("utf8");
    const name = path.basename(uri.fsPath, ".md");
    guides.push({ name, uri, content });
  }

  return guides.sort((a, b) => a.name.localeCompare(b.name));
}

export async function ensureStyleGuidesFolder(): Promise<vscode.Uri | undefined> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    vscode.window.showErrorMessage("Open a workspace folder first.");
    return undefined;
  }
  const folder = getStyleGuidesFolder();
  const dirUri = vscode.Uri.joinPath(root.uri, folder);
  await vscode.workspace.fs.createDirectory(dirUri);
  return dirUri;
}

export async function createStyleGuide(): Promise<void> {
  const dirUri = await ensureStyleGuidesFolder();
  if (!dirUri) return;

  const name = await vscode.window.showInputBox({
    prompt: "Name for the new style guide (used as filename)",
    placeHolder: "e.g. google-ts-style",
  });
  if (!name) return;

  const fileUri = vscode.Uri.joinPath(dirUri, `${name}.md`);
  const template = `# ${name}\n\nDescribe the coding style rules Claude should apply.\n\n- Rule one\n- Rule two\n`;
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template, "utf8"));

  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc);
}

export function watchStyleGuides(onChange: () => void): vscode.Disposable {
  const folder = getStyleGuidesFolder();
  const pattern = new vscode.RelativePattern(
    vscode.workspace.workspaceFolders?.[0] ?? "",
    `${folder}/*.md`
  );
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(onChange);
  watcher.onDidChange(onChange);
  watcher.onDidDelete(onChange);
  return watcher;
}
