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

## Recommended Ollama models

### Lightweight default

GPTweak defaults to:

```bash
ollama pull qwen3:1.7b
```

This is a good lightweight option for quick grammar fixes and simple rewrites.

### Recommended for better instruction following

If the smaller model sometimes **answers or interprets your text instead of rewriting it**, use:

```bash
ollama pull qwen3:4b-instruct
```

Then select `qwen3:4b-instruct` in the GPTweak popup.

The 4B Instruct model is larger, but it is generally a better fit for GPTweak's text-transformation instructions, especially with short or ambiguous phrases.

### Smaller/faster alternative

```bash
ollama pull gemma3:1b
```

This can be useful on lower-powered machines, although very small models may be less consistent at following strict rewrite instructions.

## Generation settings

GPTweak currently uses:

```text
temperature: 0.2
thinking: false
```

The temperature is intentionally kept at **0.2** rather than zero. This allows a small amount of natural variation between rewrites while keeping the output fairly focused and predictable.

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

## FAQ / Troubleshooting

### The model answers my text instead of rewriting it

Small local models can sometimes interpret short or ambiguous input as a conversational request rather than text that should be edited.

For example, a phrase such as:

```text
This is a PR
```

should normally stay close to the original wording when using **Fix**, but a weaker instruction-following model may incorrectly respond to what it thinks `PR` means or ask for more context.

If this happens:

1. Try `qwen3:4b-instruct`, which is recommended for stronger instruction following:

   ```powershell
   ollama pull qwen3:4b-instruct
   ```

2. Open the GPTweak popup and select the exact installed model name.
3. Retry the rewrite. Because GPTweak uses `temperature: 0.2`, a retry can occasionally produce a better wording while still keeping variance low.
4. Use **Fix** when you want minimal corrections and **Rephrase** when you want more freedom in the wording.

A stronger model generally helps more than increasing model creativity. GPTweak intentionally keeps the temperature low at `0.2`.

### Ollama returns HTTP 403 for `POST /api/chat`

If Ollama logs something like:

```text
403 | 127.0.0.1 | POST "/api/chat"
```

Ollama is receiving the request but is rejecting the Chrome extension origin. Browser extension origins must be explicitly allowed with `OLLAMA_ORIGINS`.

On Windows, open PowerShell and run:

```powershell
setx OLLAMA_ORIGINS "chrome-extension://*"
```

Then **completely quit Ollama from the Windows system tray and start it again**. The environment variable is only picked up by a newly started Ollama process.

For tighter security, you can allow only GPTweak instead of all Chrome extensions. Find the extension ID at `chrome://extensions` and set:

```powershell
setx OLLAMA_ORIGINS "chrome-extension://YOUR_EXTENSION_ID"
```

Then restart Ollama again.

### Ollama returns HTTP 404 for `POST /api/chat`

If Ollama logs:

```text
404 | 127.0.0.1 | POST "/api/chat"
```

`/api/chat` is a valid Ollama endpoint. A common reason for a 404 is that the model requested by GPTweak is not installed locally.

Check your installed models:

```powershell
ollama list
```

GPTweak defaults to `qwen3:1.7b`. If it is missing, install it:

```powershell
ollama pull qwen3:1.7b
```

You can also select another installed model from the GPTweak popup.

To verify the model directly from PowerShell, run:

```powershell
$body = @{
  model = "qwen3:1.7b"
  messages = @(
    @{ role = "user"; content = "Hello" }
  )
  stream = $false
} | ConvertTo-Json -Depth 4

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:11434/api/chat" `
  -ContentType "application/json" `
  -Body $body
```

If that succeeds, Ollama and the model are working and GPTweak should be able to use them. If it still returns 404 even though the exact model name appears in `ollama list`, check your Ollama version with:

```powershell
ollama --version
```

Then update/restart Ollama and try again.

### GPTweak cannot connect to Ollama

Confirm Ollama is running and that the local API responds:

```powershell
Invoke-RestMethod "http://localhost:11434/api/tags"
```

GPTweak currently permits only these local endpoints:

- `http://localhost:11434`
- `http://127.0.0.1:11434`

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
