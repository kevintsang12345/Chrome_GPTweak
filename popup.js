const DEFAULTS = {
  endpoint: "http://localhost:11434",
  model: "qwen3:1.7b"
};

const modelSelect = document.getElementById("model");
const customModel = document.getElementById("customModel");
const endpointSelect = document.getElementById("endpoint");
const statusEl = document.getElementById("status");

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", error);
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  endpointSelect.value = settings.endpoint || DEFAULTS.endpoint;
  customModel.value = settings.model || DEFAULTS.model;
  await refreshModels(settings.model || DEFAULTS.model);
}

async function refreshModels(preferred) {
  setStatus("Checking Ollama…");
  modelSelect.innerHTML = "";
  try {
    const endpoint = endpointSelect.value.replace(/\/$/, "");
    const response = await fetch(`${endpoint}/api/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const names = (data.models || []).map((m) => m.name || m.model).filter(Boolean).sort();

    if (!names.length) {
      const option = new Option("No local models found", "");
      modelSelect.add(option);
      setStatus("Ollama is running, but no models were found.", true);
      return;
    }

    for (const name of names) modelSelect.add(new Option(name, name));
    const target = preferred && names.includes(preferred) ? preferred : names[0];
    modelSelect.value = target;
    customModel.value = preferred || target;
    setStatus(`${names.length} local model${names.length === 1 ? "" : "s"} found.`);
  } catch (error) {
    modelSelect.add(new Option("Could not load models", ""));
    setStatus("Could not reach Ollama. Make sure it is running on port 11434.", true);
  }
}

document.getElementById("refresh").addEventListener("click", () => refreshModels(customModel.value.trim()));
endpointSelect.addEventListener("change", () => refreshModels(customModel.value.trim()));
modelSelect.addEventListener("change", () => {
  if (modelSelect.value) customModel.value = modelSelect.value;
});

document.getElementById("save").addEventListener("click", async () => {
  const model = customModel.value.trim() || modelSelect.value;
  if (!model) {
    setStatus("Choose or enter a model name.", true);
    return;
  }
  await chrome.storage.sync.set({ endpoint: endpointSelect.value, model });
  setStatus(`Saved. Using ${model}.`);
});

loadSettings();
