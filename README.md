# Chrome_GPTweak

GPTweak is a lightweight Chrome Manifest V3 extension that fixes and rewrites text directly inside web text boxes using a **local Ollama model**.

Your text stays on your machine: the extension only talks to `localhost:11434` / `127.0.0.1:11434`.

## Features

- Floating toolbar inside/next to focused text fields
- **Fix** — spelling, grammar, punctuation, and light wording cleanup
- **Rephrase** — clearer, more natural wording
- **Shorten** — removes unnecessary words while preserving meaning
- **Professional** — polished professional tone without sounding overly formal
- **Undo** — restores the last rewrite
- Selection-aware: highlight text to rewrite only that selection; otherwise the whole field is rewritten
- Configurable Ollama model
- No cloud API keys, analytics, or external LLM calls

## Recommended Ollama model

The default is:

```bash
ollama pull qwen3:1.7b
```

If you want something smaller/faster:

```bash
ollama pull gemma3:1b
```

If you want better rewrite quality and have enough RAM/VRAM:

```bash
ollama pull qwen3:4b
```

## Install in Chrome

1. Make sure Ollama is running.
2. Pull a model, for example `ollama pull qwen3:1.7b`.
3. Clone or download this repository.
4. Open Chrome and go to `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the repository folder containing `manifest.json`.
8. Open GPTweak from the Chrome extensions menu, choose the Ollama model, and click **Save**.
9. Refresh any tabs that were already open before installing the extension.

## Usage

Focus a normal text input, textarea, or contenteditable editor. GPTweak shows a small floating toolbar near the lower-right of the field.

If you select part of the text before clicking a mode, only the selection is rewritten. With no selection, GPTweak rewrites the whole field.

## Privacy

The manifest grants network access only to:

- `http://localhost:11434/*`
- `http://127.0.0.1:11434/*`

There are no cloud LLM API calls or analytics in the extension.

## Compatibility notes

- Chrome internal pages such as `chrome://settings` do not allow ordinary content-script extensions.
- Standard inputs, textareas, and most `contenteditable` editors are supported.
- Some complex web editors use custom document models and may need site-specific handling.
- The first rewrite can be slower while Ollama loads the model; GPTweak asks Ollama to keep it loaded for 10 minutes after use.
