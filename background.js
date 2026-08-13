const DEFAULTS = {
  endpoint: "http://localhost:11434",
  model: "qwen3:1.7b"
};

const MODE_PROMPTS = {
  grammar: `Correct spelling, grammar, punctuation, and awkward wording in the user's text.
Preserve the original meaning, tone, formatting, line breaks, emoji, and level of formality as much as possible.
Make the smallest changes necessary. Do not add new information.
Return ONLY the corrected text, with no quotes, labels, markdown fences, explanations, or commentary.`,

  rephrase: `Rewrite the user's text so it sounds natural, clear, and fluent.
Preserve the original meaning and general tone. Keep it human and concise; do not make it sound overly formal or corporate unless the source already is.
Do not add new facts or arguments.
Return ONLY the rewritten text, with no quotes, labels, markdown fences, explanations, or commentary.`,

  shorten: `Shorten the user's text while preserving the important meaning and tone.
Remove repetition and unnecessary words. Keep names, numbers, links, and essential details intact.
Return ONLY the shortened text, with no quotes, labels, markdown fences, explanations, or commentary.`,

  professional: `Rewrite the user's text to sound polished, professional, and natural without becoming stiff or overly formal.
Preserve the original meaning. Keep it concise and do not add new information.
Return ONLY the rewritten text, with no quotes, labels, markdown fences, explanations, or commentary.`
};

async function getSettings() {
  return await chrome.storage.sync.get(DEFAULTS);
}

function normalizeEndpoint(endpoint) {
  const value = (endpoint || DEFAULTS.endpoint).trim().replace(/\/$/, "");
  if (value !== "http://localhost:11434" && value !== "http://127.0.0.1:11434") {
    throw new Error("For safety, the extension only allows Ollama on localhost:11434 or 127.0.0.1:11434.");
  }
  return value;
}

function cleanModelOutput(text) {
  let result = (text || "").trim();
  result = result.replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "").trim();

  const quotePairs = [["\"", "\""], ["'", "'"], ["“", "”"]];
  for (const [start, end] of quotePairs) {
    if (result.startsWith(start) && result.endsWith(end) && result.length > 1) {
      result = result.slice(start.length, -end.length).trim();
      break;
    }
  }
  return result;
}

async function rewriteText(text, mode) {
  if (!text || !text.trim()) throw new Error("There is no text to rewrite.");
  if (text.length > 20000) throw new Error("Text is too long. Please keep it under 20,000 characters.");

  const { endpoint, model } = await getSettings();
  const baseUrl = normalizeEndpoint(endpoint);
  const selectedModel = (model || DEFAULTS.model).trim();
  if (!selectedModel) throw new Error("Please choose an Ollama model in the extension popup.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        stream: false,
        think: false,
        keep_alive: "10m",
        messages: [
          { role: "system", content: MODE_PROMPTS[mode] || MODE_PROMPTS.rephrase },
          { role: "user", content: text }
        ],
        options: {
          temperature: 0.2,
          num_predict: 1200
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body.error ? `: ${body.error}` : "";
      } catch (_) {}
      throw new Error(`Ollama returned HTTP ${response.status}${detail}`);
    }

    const data = await response.json();
    const output = cleanModelOutput(data?.message?.content);
    if (!output) throw new Error("Ollama returned an empty response.");
    return output;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Ollama took too long to respond.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not connect to Ollama. Make sure Ollama is running on localhost:11434.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GPTWEAK_REWRITE") return;

  rewriteText(message.text, message.mode)
    .then((text) => sendResponse({ ok: true, text }))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
