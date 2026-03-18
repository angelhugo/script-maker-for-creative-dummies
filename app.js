let state = { scenes: [], writingMode: false };
let modalScene = null;

function uid() {
  return Math.random().toString(36).slice(2);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function newDocument() {
  state.scenes = [
    {
      id: uid(),
      heading: { type: "EXT.", location: "CITY STREET", time: "NIGHT" },
      description: "The street is empty.",
      blocks: [
        { id: uid(), type: "action", text: "John walks into the street." },
        { id: uid(), type: "character", name: "JOHN", suffix: "" },
        { id: uid(), type: "dialogue", text: "I shouldn't be here." }
      ]
    },
    {
      id: uid(),
      heading: { type: "INT.", location: "NEWSROOM", time: "DAY" },
      description: "The newsroom is quiet.",
      blocks: [
        { id: uid(), type: "character", name: "EDITOR", suffix: "" },
        { id: uid(), type: "dialogue", text: "Give me page one before the coffee gets cold." }
      ]
    }
  ];
  render();
}

function headingString(scene) {
  return `${scene.heading.type} ${scene.heading.location} - ${scene.heading.time}`;
}

function collectCharacterNames(excludeBlockId = null) {
  const names = [];

  state.scenes.forEach(scene => {
    scene.blocks.forEach(block => {
      if (
        block.type === "character" &&
        block.name &&
        block.id !== excludeBlockId &&
        !names.includes(block.name)
      ) {
        names.push(block.name);
      }
    });
  });

  if (modalScene) {
    modalScene.blocks.forEach(block => {
      if (
        block.type === "character" &&
        block.name &&
        block.id !== excludeBlockId &&
        !names.includes(block.name)
      ) {
        names.push(block.name);
      }
    });
  }

  return names.sort();
}

function estimateSceneLines(scene) {
  let lines = 0;
  lines += 2;

  if (scene.description) {
    lines += Math.max(1, Math.ceil(scene.description.length / 65)) + 1;
  }

  scene.blocks.forEach(block => {
    if (block.type === "action") {
      lines += Math.max(1, Math.ceil((block.text || "").length / 65)) + 1;
    }
    if (block.type === "character") {
      lines += 1;
    }
    if (block.type === "dialogue") {
      lines += Math.max(1, Math.ceil((block.text || "").length / 38)) + 1;
    }
    if (block.type === "parenthetical") {
      lines += Math.max(1, Math.ceil((block.text || "").length / 32)) + 1;
    }
    if (block.type === "transition") {
      lines += 1;
    }
  });

  lines += 1;
  return lines;
}

function paginateScenes() {
  const maxLines = 52;
  const pages = [];
  let current = [];
  let currentLines = 0;

  state.scenes.forEach((scene, idx) => {
    const needed = estimateSceneLines(scene);

    if (current.length && currentLines + needed > maxLines) {
      pages.push(current);
      current = [];
      currentLines = 0;
    }

    current.push({ scene, sceneNumber: idx + 1 });
    currentLines += needed;
  });

  if (current.length) pages.push(current);

  return pages;
}

function render() {
  renderWritingModeButton();
  renderScenes();
  renderPages();
  renderGlossary();
}

function renderWritingModeButton() {
  const btn = document.getElementById("writingModeBtn");
  const help = document.getElementById("writingModeHelp");

  if (!btn || !help) return;

  btn.textContent = `Modo escritura: ${state.writingMode ? "ON" : "OFF"}`;
  btn.className = state.writingMode ? "toggle-on" : "toggle-off";

  help.textContent = state.writingMode
    ? "Modo escritura: el bloque activo del modal se recentra y se resalta."
    : "Modo normal: el modal no recentra el bloque activo.";
}

function toggleWritingMode() {
  state.writingMode = !state.writingMode;
  renderWritingModeButton();
}

function miniBtn(label, fn) {
  const button = document.createElement("button");
  button.className = "small";
  button.textContent = label;
  button.onclick = fn;
  return button;
}

function renderScenes() {
  const el = document.getElementById("sceneList");
  el.innerHTML = "";

  state.scenes.forEach((scene, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${i + 1}. ${escapeHtml(headingString(scene))}</strong><div class="muted">Escena ${i + 1}</div>`;

    const actions = document.createElement("div");
    actions.className = "scene-list-actions";
    actions.appendChild(miniBtn("Editar", () => openSceneModal("edit", scene.id)));
    actions.appendChild(miniBtn("↑", () => moveScene(scene.id, -1)));
    actions.appendChild(miniBtn("↓", () => moveScene(scene.id, 1)));
    actions.appendChild(miniBtn("Eliminar", () => deleteScene(scene.id)));

    div.appendChild(actions);
    el.appendChild(div);
  });
}

function moveScene(id, dir) {
  const i = state.scenes.findIndex(scene => scene.id === id);
  const j = i + dir;

  if (i < 0 || j < 0 || j >= state.scenes.length) return;

  [state.scenes[i], state.scenes[j]] = [state.scenes[j], state.scenes[i]];
  render();
}

function deleteScene(id) {
  if (state.scenes.length === 1) return;
  state.scenes = state.scenes.filter(scene => scene.id !== id);
  render();
}

function appendLine(parent, text, cls = "") {
  if (text === undefined || text === null || text === "") return;

  const line = document.createElement("div");
  line.className = "script-line " + cls;
  line.textContent = text;
  parent.appendChild(line);
}

function renderPages() {
  const container = document.getElementById("pagesContainer");
  container.innerHTML = "";

  const pages = paginateScenes();

  pages.forEach((pageScenes, pageIndex) => {
    const shell = document.createElement("div");
    shell.className = "page-shell";

    const meta = document.createElement("div");
    meta.className = "page-meta";
    meta.innerHTML = `<span>Página ${pageIndex + 1}</span><span>1 página ≈ 1 minuto de acción</span>`;

    const page = document.createElement("div");
    page.className = "page";

    const content = document.createElement("div");
    content.className = "page-content";

    pageScenes.forEach(({ scene, sceneNumber }, localIndex) => {
      const wrap = document.createElement("div");
      wrap.className = "scene-block";

      const hover = document.createElement("div");
      hover.className = "scene-hover";
      hover.appendChild(miniBtn("Editar", () => openSceneModal("edit", scene.id)));
      wrap.appendChild(hover);

      const badge = document.createElement("div");
      badge.className = "scene-number-badge";
      badge.textContent = `SCENE ${sceneNumber}`;
      wrap.appendChild(badge);

      appendLine(wrap, headingString(scene), "sp-heading");
      appendLine(wrap, scene.description || "");

      scene.blocks.forEach(block => {
        if (block.type === "action") appendLine(wrap, block.text || "");
        if (block.type === "character") {
          appendLine(wrap, [block.name, block.suffix].filter(Boolean).join(" "), "sp-character");
        }
        if (block.type === "dialogue") appendLine(wrap, block.text || "", "sp-dialogue");
        if (block.type === "parenthetical") appendLine(wrap, block.text || "", "sp-parenthetical");
        if (block.type === "transition") appendLine(wrap, block.value || "", "sp-transition");
      });

      if (pageIndex === pages.length - 1 && localIndex === pageScenes.length - 1) {
        const add = document.createElement("div");
        add.className = "add-scene";
        add.textContent = "+ Agregar escena";
        add.onclick = () => openSceneModal("new");
        wrap.appendChild(add);
      }

      content.appendChild(wrap);
    });

    shell.appendChild(meta);
    page.appendChild(content);
    shell.appendChild(page);
    container.appendChild(shell);
  });
}

function openSceneModal(mode, id = null) {
  modalScene =
    mode === "edit"
      ? clone(state.scenes.find(scene => scene.id === id))
      : {
          id: uid(),
          heading: { type: "INT.", location: "LOCATION", time: "DAY" },
          description: "",
          blocks: []
        };

  document.getElementById("modalTitle").textContent =
    mode === "edit" ? "Editar escena" : "Agregar escena";

  document.getElementById("modal").style.display = "flex";
  renderModal();
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  modalScene = null;
}

function createContextHelp(items) {
  const box = document.createElement("div");
  box.className = "inline-help";

  const lines = items.map(item => `${item.v} — ${item.d}`);
  box.innerHTML = lines.join("<br>");

  return box;
}

function renderCharacterSuggestions(containerId, excludeBlockId, currentValue, onSelect) {
  const box = document.getElementById(containerId);
  if (!box) return;

  box.innerHTML = "";

  const names = collectCharacterNames(excludeBlockId)
    .filter(name => !currentValue || name.includes(currentValue.toUpperCase()))
    .slice(0, 6);

  if (!names.length) return;

  names.forEach(name => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = name;
    chip.onclick = () => onSelect(name);
    box.appendChild(chip);
  });
}

function labelFor(type) {
  return {
    action: "Acción",
    character: "Personaje",
    dialogue: "Diálogo",
    parenthetical: "Acotación",
    transition: "Transición"
  }[type];
}

function helpFor(type) {
  return {
    action: "Describe lo que se ve en pantalla.",
    character: "Identifica quién habla y permite autocompletar nombres ya usados.",
    dialogue: "Contiene lo que dice el personaje.",
    parenthetical: "Indica cómo se dice una línea.",
    transition: "Marca el cambio entre escenas."
  }[type];
}

function renderBlock(block, index) {
  const el = document.createElement("div");
  el.className = "block";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.gap = "8px";

  const title = document.createElement("div");
  title.innerHTML = `<strong>${labelFor(block.type)}</strong><div class="inline-help">${helpFor(block.type)}</div>`;

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "6px";
  actions.appendChild(miniBtn("↑", () => moveModalBlock(index, -1)));
  actions.appendChild(miniBtn("↓", () => moveModalBlock(index, 1)));
  actions.appendChild(miniBtn("Eliminar", () => deleteModalBlock(index)));

  header.appendChild(title);
  header.appendChild(actions);
  el.appendChild(header);

  if (block.type === "action") {
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Describe lo que ocurre en pantalla. Ej: John opens the door and steps inside.";
    textarea.value = block.text || "";
    textarea.oninput = e => {
      block.text = e.target.value;
      maybeTypewriter(e.target);
    };
    el.appendChild(textarea);

    const tip = document.createElement("div");
    tip.className = "inline-help";
    tip.innerHTML = "<strong>Tip:</strong> escribe solo lo visible. No pensamientos internos.";
    el.appendChild(tip);
  }

  if (block.type === "character") {
    const input = document.createElement("input");
    input.className = "field";
    input.placeholder = "Escribe el nombre del personaje (ej: JOHN, SARAH)";
    input.value = block.name || "";
    input.oninput = e => {
      block.name = e.target.value.toUpperCase();
      renderCharacterSuggestions(suggestionsId, block.id, block.name, selected => {
        block.name = selected;
        renderModal();
      });
      maybeTypewriter(e.target);
    };
    el.appendChild(input);

    const select = document.createElement("select");
    CHARACTER_SUFFIXES.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.v;
      option.textContent = `${opt.v || "none"} — ${opt.d}`;
      option.selected = opt.v === (block.suffix || "");
      select.appendChild(option);
    });
    select.onchange = e => {
      block.suffix = e.target.value;
      maybeTypewriter(e.target);
    };
    el.appendChild(select);

    const suffixHelp = createContextHelp(CHARACTER_SUFFIXES.filter(item => item.v));
    el.appendChild(suffixHelp);

    const suggestionsId = "suggestions-" + uid();
    const suggestions = document.createElement("div");
    suggestions.id = suggestionsId;
    suggestions.className = "suggestions";
    el.appendChild(suggestions);

    renderCharacterSuggestions(suggestionsId, block.id, block.name, selected => {
      block.name = selected;
      renderModal();
    });
  }

  if (block.type === "dialogue") {
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Escribe lo que dice el personaje. Ej: I shouldn't be here.";
    textarea.value = block.text || "";
    textarea.oninput = e => {
      block.text = e.target.value;
      maybeTypewriter(e.target);
    };
    el.appendChild(textarea);

    const tip = document.createElement("div");
    tip.className = "inline-help";
    tip.innerHTML = "<strong>Ejemplo:</strong> I told you this would happen.";
    el.appendChild(tip);
  }

  if (block.type === "parenthetical") {
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Escribe una acotación breve. Ej: (whispering), (angry)";
    textarea.value = block.text || "";
    textarea.oninput = e => {
      block.text = e.target.value;
      maybeTypewriter(e.target);
    };
    el.appendChild(textarea);

    const tip = document.createElement("div");
    tip.className = "inline-help";
    tip.innerHTML = "<strong>Tip:</strong> úsala con moderación y solo para indicar cómo se dice la línea.";
    el.appendChild(tip);
  }

  if (block.type === "transition") {
    const select = document.createElement("select");
    TRANSITIONS.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.v;
      option.textContent = `${opt.v} — ${opt.d}`;
      option.selected = opt.v === (block.value || "");
      select.appendChild(option);
    });
    select.onchange = e => {
      block.value = e.target.value;
      maybeTypewriter(e.target);
    };
    el.appendChild(select);

    const transitionHelp = createContextHelp(TRANSITIONS);
    el.appendChild(transitionHelp);
  }

  return el;
}

function renderModal() {
  const body = document.getElementById("modalBody");
  body.innerHTML = "";

  const headingSection = document.createElement("div");
  headingSection.className = "section";
  headingSection.innerHTML = `
    <div class="section-title">Encabezado</div>
    <div class="help">Define dónde y cuándo ocurre la escena.</div>
    <div class="grid3">
      <select id="mType"></select>
      <input id="mLoc" class="field" placeholder="Escribe el lugar de la escena (ej: APARTMENT, CITY STREET)" value="${escapeHtml(modalScene.heading.location)}">
      <select id="mTime"></select>
    </div>
    <div class="inline-help"><strong>Ejemplo:</strong> EXT. CITY STREET - NIGHT</div>
  `;
  body.appendChild(headingSection);

  const typeSel = headingSection.querySelector("#mType");
  HEADING_TYPES.forEach(v => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    option.selected = v === modalScene.heading.type;
    typeSel.appendChild(option);
  });
  typeSel.onchange = e => {
    modalScene.heading.type = e.target.value;
    maybeTypewriter(e.target);
  };

  const timeSel = headingSection.querySelector("#mTime");
  TIMES.forEach(v => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    option.selected = v === modalScene.heading.time;
    timeSel.appendChild(option);
  });
  timeSel.onchange = e => {
    modalScene.heading.time = e.target.value;
    maybeTypewriter(e.target);
  };

  headingSection.querySelector("#mLoc").oninput = e => {
    modalScene.heading.location = e.target.value.toUpperCase();
    maybeTypewriter(e.target);
  };

  const descSection = document.createElement("div");
  descSection.className = "section";
  descSection.innerHTML = `
    <div class="section-title">Descripción</div>
    <div class="help">Describe el ambiente inicial. Solo lo que se puede ver u oír.</div>
    <textarea id="mDesc" placeholder="Describe el ambiente o situación inicial de la escena.">${escapeHtml(modalScene.description)}</textarea>
  `;
  descSection.querySelector("#mDesc").oninput = e => {
    modalScene.description = e.target.value;
    maybeTypewriter(e.target);
  };
  body.appendChild(descSection);

  const blocksSection = document.createElement("div");
  blocksSection.className = "section";
  blocksSection.innerHTML = `
    <div class="section-title">Bloques</div>
    <div class="help">Agrega acciones, personajes, diálogos, acotaciones y transiciones.</div>
  `;

  modalScene.blocks.forEach((block, index) => {
    blocksSection.appendChild(renderBlock(block, index));
  });

  const add = document.createElement("div");
  add.innerHTML = `
    <button type="button" onclick="addBlock('action')">+ Acción</button>
    <button type="button" onclick="addBlock('character')">+ Personaje</button>
    <button type="button" onclick="addBlock('dialogue')">+ Diálogo</button>
    <button type="button" onclick="addBlock('parenthetical')">+ Acotación</button>
    <button type="button" onclick="addBlock('transition')">+ Transición</button>
  `;
  blocksSection.appendChild(add);

  body.appendChild(blocksSection);
}

function addBlock(type) {
  const block = { id: uid(), type };

  if (type === "action" || type === "dialogue" || type === "parenthetical") {
    block.text = "";
  }

  if (type === "character") {
    block.name = "";
    block.suffix = "";
  }

  if (type === "transition") {
    block.value = "CUT TO:";
  }

  modalScene.blocks.push(block);
  renderModal();
}

function moveModalBlock(index, dir) {
  const j = index + dir;
  if (j < 0 || j >= modalScene.blocks.length) return;
  [modalScene.blocks[index], modalScene.blocks[j]] = [modalScene.blocks[j], modalScene.blocks[index]];
  renderModal();
}

function deleteModalBlock(index) {
  modalScene.blocks.splice(index, 1);
  renderModal();
}

function saveScene() {
  const idx = state.scenes.findIndex(scene => scene.id === modalScene.id);

  if (idx >= 0) {
    state.scenes[idx] = clone(modalScene);
  } else {
    state.scenes.push(clone(modalScene));
  }

  closeModal();
  render();
}

function renderGlossary() {
  const g = document.getElementById("glossary");
  g.innerHTML = "";

  GLOSSARY.forEach(item => {
    const d = document.createElement("div");
    d.className = "g-item";
    d.textContent = item;
    g.appendChild(d);
  });
}

function exportTXT() {
  let out = "";

  state.scenes.forEach((scene, i) => {
    out += `${i + 1}. ${headingString(scene)}\n\n`;
    out += (scene.description || "") + "\n\n";

    scene.blocks.forEach(block => {
      if (block.type === "action") out += (block.text || "") + "\n";
      if (block.type === "character") out += [block.name, block.suffix].filter(Boolean).join(" ") + "\n";
      if (block.type === "dialogue") out += (block.text || "") + "\n";
      if (block.type === "parenthetical") out += (block.text || "") + "\n";
      if (block.type === "transition") out += (block.value || "") + "\n";
    });

    out += "\n";
  });

  const blob = new Blob([out]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "script.txt";
  a.click();
}

function maybeTypewriter(element) {
  document.querySelectorAll(".writing-active").forEach(el => el.classList.remove("writing-active"));

  if (!state.writingMode || !element) return;

  const target = element.closest(".block") || element.closest(".section") || element;

  if (target && target.classList) {
    target.classList.add("writing-active");
  }

  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

newDocument();
