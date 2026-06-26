import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "./main.css";
import "highlight.js/styles/github-dark.css";

let currentAnswerSection : HTMLElement | null = null;

window.addEventListener("message", handleEvent);

function handleEvent(event: MessageEvent) : void {
  const msg = event.data as { type: string; content?: string };

  console.log(msg);

  if (!currentAnswerSection) {
    currentAnswerSection = document.createElement('div');
    currentAnswerSection.classList.add('content_answer');

    document.getElementById("content")?.prepend(currentAnswerSection);
  }

  switch (msg.type) {
    case 'update':
      currentAnswerSection.innerHTML = md.render(msg.content ?? '');
      currentAnswerSection = null;
      break;
    case 'prepare':
      currentAnswerSection.innerHTML = 'Loading...'
      break;
  }
  if (msg.type === "update") {

  }
}

const md: MarkdownIt = new MarkdownIt({
  highlight: (str: string, lang: string): string => {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(str, { language: lang }).value;
      }
    } catch {
      // fall through to plain rendering
    }
    return hljs.highlightAuto(str).value;
  },
});

// Override the default fence renderer to wrap each code block in a
// positioned container with a copy button. The raw (unescaped) code is
// stashed in a data attribute so the click handler can read it back
// without having to un-highlight the rendered HTML.
const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules);
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const rawCode = token.content;
  const highlighted = defaultFence(tokens, idx, options, env, self);

  const encoded = encodeURIComponent(rawCode);

  return `<div class="code-block">
  <button class="copy-button" data-code="${encoded}" type="button">Copy</button>
  ${highlighted}
</div>`;
}

async function copyToClipboard(button: HTMLButtonElement): Promise<void> {
  const encoded = button.getAttribute("data-code") ?? "";
  const code = decodeURIComponent(encoded);

  try {
    await navigator.clipboard.writeText(code);
    const original = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("copied");
    }, 1500);
  } catch {
    button.textContent = "Failed";
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1500);
  }
}

// Event delegation: survives every re-render triggered by postMessage
// updates, since we never need to re-attach listeners to new buttons.
document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest(".copy-button") as HTMLButtonElement | null;
  if (button) {
    void copyToClipboard(button);
  }
});