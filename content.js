(() => {
  if (window.__gptweakLoaded) return;
  window.__gptweakLoaded = true;

  const state = {
    active: null,
    lastEdit: null,
    busy: false,
    hideTimer: null
  };

  const host = document.createElement("div");
  host.id = "gptweak-root";
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";
  host.style.display = "none";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .lw-wrap {
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        font-size: 12px;
        color: #1f2937;
      }
      .lw-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px;
        background: rgba(255,255,255,.97);
        border: 1px solid rgba(17,24,39,.16);
        border-radius: 10px;
        box-shadow: 0 4px 18px rgba(0,0,0,.16);
        backdrop-filter: blur(8px);
        max-width: calc(100vw - 16px);
      }
      button {
        all: unset;
        box-sizing: border-box;
        cursor: pointer;
        white-space: nowrap;
        border-radius: 7px;
        padding: 6px 8px;
        color: #374151;
        line-height: 1;
        user-select: none;
      }
      button:hover { background: #f3f4f6; color: #111827; }
      button:focus-visible { outline: 2px solid #6366f1; outline-offset: 1px; }
      button[disabled] { opacity: .45; cursor: default; }
      .lw-main {
        font-weight: 700;
        background: #f5f3ff;
        color: #5b21b6;
      }
      .lw-main:hover { background: #ede9fe; color: #4c1d95; }
      .lw-sep { width: 1px; height: 18px; background: #e5e7eb; margin: 0 1px; }
      .lw-status { padding: 0 5px; color: #6b7280; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .lw-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid #ddd6fe;
        border-top-color: #7c3aed;
        border-radius: 50%;
        animation: spin .7s linear infinite;
        margin: 0 4px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .lw-error { color: #b91c1c; }
      @media (max-width: 700px) {
        button { padding: 7px 7px; }
        .lw-label-long { display: none; }
      }
    </style>
    <div class="lw-wrap">
      <div class="lw-pill" role="toolbar" aria-label="GPTweak">
        <button class="lw-main" data-mode="grammar" title="Fix grammar and spelling">✓ <span class="lw-label-long">Fix</span></button>
        <button data-mode="rephrase" title="Rephrase naturally">✨ <span class="lw-label-long">Rephrase</span></button>
        <button data-mode="shorten" title="Shorten">↘ <span class="lw-label-long">Shorten</span></button>
        <button data-mode="professional" title="Make professional">💼 <span class="lw-label-long">Professional</span></button>
        <div class="lw-sep"></div>
        <button data-action="undo" title="Undo last rewrite" disabled>↶</button>
        <span class="lw-status" hidden></span>
        <span class="lw-spinner" hidden></span>
      </div>
    </div>`;

  const pill = shadow.querySelector(".lw-pill");
  const statusEl = shadow.querySelector(".lw-status");
  const spinnerEl = shadow.querySelector(".lw-spinner");
  const undoButton = shadow.querySelector('[data-action="undo"]');
  const modeButtons = [...shadow.querySelectorAll("button[data-mode]")];

  function isTextInput(el) {
    if (!(el instanceof HTMLInputElement)) return false;
    const type = (el.type || "text").toLowerCase();
    return ["text", "search", "email", "url", "tel"].includes(type) && !el.readOnly && !el.disabled;
  }

  function isEditable(el) {
    if (!el || !(el instanceof Element)) return false;
    if (isTextInput(el)) return true;
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (el.isContentEditable) return true;
    return el.getAttribute("role") === "textbox" && el.getAttribute("aria-readonly") !== "true";
  }

  function closestEditable(start) {
    let el = start instanceof Element ? start : start?.parentElement;
    while (el) {
      if (isEditable(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function getInputSelection(el) {
    const value = el.value || "";
    const start = typeof el.selectionStart === "number" ? el.selectionStart : 0;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : value.length;
    const hasSelection = end > start;
    return {
      fullText: value,
      selectedText: hasSelection ? value.slice(start, end) : value,
      start: hasSelection ? start : 0,
      end: hasSelection ? end : value.length,
      hadSelection: hasSelection
    };
  }

  function getContentEditableSelection(el) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        return { selectedText: selection.toString(), range: range.cloneRange(), hadSelection: true };
      }
    }
    return { selectedText: el.innerText || el.textContent || "", range: null, hadSelection: false };
  }

  function readTarget(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return { kind: "input", ...getInputSelection(el) };
    }
    return { kind: "contenteditable", ...getContentEditableSelection(el) };
  }

  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor?.set?.call(el, value);
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function replaceTarget(el, snapshot, replacement) {
    if (snapshot.kind === "input") {
      const next = snapshot.fullText.slice(0, snapshot.start) + replacement + snapshot.fullText.slice(snapshot.end);
      setNativeValue(el, next);
      const caret = snapshot.start + replacement.length;
      try { el.setSelectionRange(caret, caret); } catch (_) {}
      return { before: snapshot.fullText, after: next, kind: "input" };
    }

    const before = el.innerHTML;
    if (snapshot.hadSelection && snapshot.range) {
      const range = snapshot.range;
      range.deleteContents();
      const textNode = document.createTextNode(replacement);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement }));
    } else {
      el.innerText = replacement;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement }));
    }
    return { before, after: el.innerHTML, kind: "contenteditable" };
  }

  function undoLast() {
    const edit = state.lastEdit;
    if (!edit || !edit.el?.isConnected) return;
    const el = edit.el;
    if (edit.kind === "input") {
      setNativeValue(el, edit.before);
    } else {
      el.innerHTML = edit.before;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "historyUndo" }));
    }
    state.lastEdit = null;
    undoButton.disabled = true;
    setStatus("Undone");
    setTimeout(clearStatus, 1200);
    el.focus();
  }

  function setBusy(value) {
    state.busy = value;
    spinnerEl.hidden = !value;
    modeButtons.forEach((b) => b.disabled = value);
    undoButton.disabled = value || !state.lastEdit;
  }

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle("lw-error", !!isError);
  }

  function clearStatus() {
    setStatus("");
  }

  async function runRewrite(mode) {
    const el = state.active;
    if (!el || !el.isConnected || state.busy) return;

    const snapshot = readTarget(el);
    const text = snapshot.selectedText;
    if (!text || !text.trim()) {
      setStatus("Type something first", true);
      setTimeout(clearStatus, 1800);
      return;
    }

    setBusy(true);
    setStatus("Writing…");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GPTWEAK_REWRITE",
        mode,
        text
      });

      if (!response?.ok) throw new Error(response?.error || "Rewrite failed.");
      const edit = replaceTarget(el, snapshot, response.text);
      state.lastEdit = { el, ...edit };
      undoButton.disabled = false;
      setStatus("Done");
      el.focus();
      setTimeout(clearStatus, 1000);
      reposition();
    } catch (error) {
      setStatus(error.message || String(error), true);
      setTimeout(clearStatus, 4500);
    } finally {
      setBusy(false);
    }
  }

  function reposition() {
    const el = state.active;
    if (!el || !el.isConnected || host.style.display === "none") return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 18 || rect.bottom < 0 || rect.top > innerHeight) {
      host.style.display = "none";
      return;
    }

    const toolbarRect = pill.getBoundingClientRect();
    const margin = 6;
    let left = Math.min(rect.right - toolbarRect.width - margin, innerWidth - toolbarRect.width - 8);
    left = Math.max(8, left);

    let top = rect.bottom - toolbarRect.height - margin;
    if (top < 8) top = Math.min(rect.bottom + margin, innerHeight - toolbarRect.height - 8);

    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
  }

  function showFor(el) {
    if (!el || !isEditable(el)) return;
    state.active = el;
    clearTimeout(state.hideTimer);
    host.style.display = "block";
    requestAnimationFrame(reposition);
  }

  function scheduleHide() {
    clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(() => {
      if (!pill.matches(":hover") && document.activeElement !== state.active) {
        host.style.display = "none";
        state.active = null;
      }
    }, 180);
  }

  document.addEventListener("focusin", (event) => {
    const el = closestEditable(event.target);
    if (el) showFor(el);
  }, true);

  document.addEventListener("focusout", (event) => {
    if (event.target === state.active || state.active?.contains?.(event.target)) scheduleHide();
  }, true);

  document.addEventListener("selectionchange", () => {
    if (state.active) reposition();
  }, true);

  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition, true);

  pill.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  pill.addEventListener("mouseenter", () => clearTimeout(state.hideTimer));
  pill.addEventListener("mouseleave", scheduleHide);

  pill.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const mode = button.dataset.mode;
    if (mode) runRewrite(mode);
    if (button.dataset.action === "undo") undoLast();
  });
})();
