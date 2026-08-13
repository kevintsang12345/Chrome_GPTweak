# Chrome_GPTweak

GPTweak is a lightweight Chrome Manifest V3 extension that fixes and rewrites text directly inside web text boxes using a **local Ollama model**.

Your text stays on your machine: the extension only talks to `localhost:11434` / `127.0.0.1:11434`.

## Features

- Floating toolbar next to focused text fields
- **Fix** — spelling, grammar, punctuation, and light wording cleanup
- **Rephrase** — clearer, more natural wording
- **Shorten** — removes unnecessary words while preserving meaning
- **Professional** — polished professional tone without sounding overly formal
- **Undo** — restores the last rewrite
- Selection-aware rewriting
- Configurable local Ollama model
- No cloud API keys, analytics, or external LLM calls

## Recommended Ollama models

Default:

```bash
ollama pull qwen3:1.7b
```

For stronger instruction following:

```bash
ollama pull qwen3:4b-instruct
```

Smaller/faster alternative:

```bash
ollama pull gemma3:1b
```

Current generation settings:

```text
temperature: 0.2
thinking: false
keep_alive: 10m
```

## How it works

GPTweak sends the selected text to Ollama through `POST /api/chat` with a strict text-transformation prompt. The current implementation requests a structured response with a single `text` field and inserts only the extracted rewritten text back into the page.

The popup discovers installed models through `GET /api/tags`.

## Install in Chrome

1. Make sure Ollama is running.
2. Pull a model, for example `ollama pull qwen3:1.7b`.
3. Clone or download this repository.
4. Open `chrome://extensions`.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select the repository folder containing `manifest.json`.
8. Open GPTweak, choose the Ollama model, and click **Save**.
9. Refresh any tabs that were already open.

## Usage

Focus a normal text input, textarea, or contenteditable editor. GPTweak shows a floating toolbar near the field.

If text is selected, GPTweak rewrites only the selection. Otherwise it rewrites the whole field.

## FAQ / Troubleshooting

### Ollama returns HTTP 403 for `POST /api/chat`

On Windows, allow Chrome extension origins:

```powershell
setx OLLAMA_ORIGINS "chrome-extension://*"
```

Then completely quit Ollama from the Windows system tray and start it again.

For tighter security, find the GPTweak extension ID at `chrome://extensions` and use:

```powershell
setx OLLAMA_ORIGINS "chrome-extension://YOUR_EXTENSION_ID"
```

Then restart Ollama again.

### Ollama returns HTTP 404 for `POST /api/chat`

Check installed models:

```powershell
ollama list
```

GPTweak defaults to `qwen3:1.7b`. If it is missing:

```powershell
ollama pull qwen3:1.7b
```

You can also select another installed model from the GPTweak popup.

### GPTweak cannot connect to Ollama

Confirm the local API responds:

```powershell
Invoke-RestMethod "http://localhost:11434/api/tags"
```

GPTweak currently permits only:

- `http://localhost:11434`
- `http://127.0.0.1:11434`

### `chrome.runtime` / `sendMessage` error after reloading the extension

After clicking **Reload** in `chrome://extensions`, refresh the webpage you are testing. Existing content scripts belong to the previous extension context and cannot continue sending messages after the extension is reloaded.

## Privacy

The manifest grants network access only to:

- `http://localhost:11434/*`
- `http://127.0.0.1:11434/*`

There are no cloud LLM API calls or analytics in the extension.

## Compatibility notes

- Chrome internal pages such as `chrome://settings` do not allow ordinary content-script extensions.
- Standard inputs, textareas, and most `contenteditable` editors are supported.
- Some complex web editors use custom document models and may need site-specific handling.
- The first rewrite can be slower while Ollama loads the model.
