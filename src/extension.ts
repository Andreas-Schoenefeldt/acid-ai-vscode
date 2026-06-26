import * as vscode from "vscode";
import { listStyleGuides, createStyleGuide } from "./styleGuides";
import { setApiKey, callClaude } from "./claudeClient";
import { showResult } from "./resultPanel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("acidAi.setApiKey", () =>
      setApiKey(context)
    ),

    vscode.commands.registerCommand("acidAi.newStyleGuide", () =>
      createStyleGuide()
    ),

    vscode.commands.registerCommand(
      "acidAi.applyStyleGuide",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
          vscode.window.showWarningMessage("Select some text first.");
          return;
        }

        const guides = await listStyleGuides();
        if (guides.length === 0) {
          const choice = await vscode.window.showWarningMessage(
            "No style guides found.",
            "New Style Guide"
          );
          if (choice === "New Style Guide") {
            await createStyleGuide();
          }
          return;
        }

        const picked = await vscode.window.showQuickPick(
          guides.map((g) => ({ label: g.name, guide: g })),
          { placeHolder: "Select a style guide to apply" }
        );
        if (!picked) return;

        const selectedText = editor.document.getText(editor.selection);
        const languageId = editor.document.languageId;

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Applying "${picked.guide.name}" style guide...`,
          },
          async () => {
            try {
              const result = await callClaude(
                context,
                selectedText,
                picked.guide.content,
                languageId
              );
              showResult(context, `Style Guide: ${picked.guide.name}`, result);
            } catch (err: any) {
              vscode.window.showErrorMessage(
                `Acid AI failed: ${err.message ?? err}`
              );
            }
          }
        );
      }
    )
  );
}

export function deactivate() {}
