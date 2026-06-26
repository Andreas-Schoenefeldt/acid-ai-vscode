import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";

const SECRET_KEY = "acidAi.anthropicApiKey";
const TOTAL_COST_KEY = "acidAi.totalCost";

const _1M = 1000000;

// USD price per 1M tokens. Check https://docs.claude.com/en/docs/about-claude/pricing for current rates.
const PRICING_USD_PER_MTOK: Record<string, { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens : number }> = {
  "claude-opus-4-8": { input_tokens: 15, output_tokens: 75, cache_read_input_tokens: 0.5, cache_creation_input_tokens : 8},
  "claude-sonnet-4-6": { input_tokens: 3, output_tokens: 15, cache_read_input_tokens: 0.3, cache_creation_input_tokens: 5},
};

type UsageTokenField =
  | "input_tokens"
  | "output_tokens"
  | "cache_read_input_tokens"
  | "cache_creation_input_tokens";

async function trackCost(
  context: vscode.ExtensionContext,
  model: string,
  usage: Anthropic.Messages.Usage
): Promise<string> {
  console.log(usage);

  const pricing = PRICING_USD_PER_MTOK[model];
  if (!pricing) throw new Error(`No pricing for ${model} found.`);
  if (!usage) return 'no cost'; // no usage, silent return

  const usd = (['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'] as UsageTokenField[])
    .reduce((sum, tokenType) => sum + ((usage[tokenType] ?? 0) / _1M) * pricing[tokenType], 0);

  const prevTotal = context.globalState.get<number>(TOTAL_COST_KEY, 0);
  const newTotal = prevTotal + usd;
  await context.globalState.update(TOTAL_COST_KEY, newTotal);

  const message = `Acid AI: \$${usd.toFixed(4)} this call · \$${newTotal.toFixed(2)} total`;

  console.log(message);
  vscode.window.setStatusBarMessage(message, 8000);

  return message;
}

export async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: "Enter your Anthropic API key",
    password: true,
    ignoreFocusOut: true,
  });
  if (!key) return;
  await context.secrets.store(SECRET_KEY, key);
  vscode.window.showInformationMessage("Anthropic API key saved.");
}

export async function getApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  let key = await context.secrets.get(SECRET_KEY);
  if (!key) {
    const choice = await vscode.window.showWarningMessage(
      "No Anthropic API key set.",
      "Set API Key"
    );
    if (choice === "Set API Key") {
      await setApiKey(context);
      key = await context.secrets.get(SECRET_KEY);
    }
  }
  return key;
}

export async function callClaude(
  context: vscode.ExtensionContext,
  selectedText: string,
  styleGuideContent: string,
  languageId: string
): Promise<string> {
  const apiKey = await getApiKey(context);
  if (!apiKey) {
    throw new Error("Anthropic API key is not set.");
  }

  const config = vscode.workspace.getConfiguration("acidAi");
  const model = config.get<string>("model", "claude-sonnet-4-6");
  const maxTokens = config.get<number>("maxTokens", 4096);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { 
        role: "user", 
        content: [
          {
            type: "text",
            text:
              "Apply the following style guide to the code below.\n" +
              "Return only the rewritten code in a single fenced code block, " +
              "with a short explanation after it if useful.\n\n" +
              "## Style guide\n" +
              styleGuideContent,
            cache_control: { type: "ephemeral" }, // <-- cached, reused across calls
          },
          {
            type: "text",
            text:
              `## Code (${languageId})\n` +
              "```" + languageId + "\n" +
              selectedText +
              "\n```",
            // no cache_control: this changes every call
          },
        ] }
    ],
  });

  const costSummary = await trackCost(context, model, response.usage);

  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim() + `\n\n${costSummary}`;
}
