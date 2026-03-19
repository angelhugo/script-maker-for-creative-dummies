let appState = {
  currentScript: null,
  writingMode: false
};

let projectDraft = null;
let sceneDraft = null;
let autosaveTimer = null;

function setSaveStatus(text, cls = "") {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.textContent = text;
  el.className = `status-line ${cls}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function formatDateToDDMMYYYY(value) {
  if (!value) return "";

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}-${m}-${y}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function touchCurrentScript() {
  if (!appState.currentScript) return;
  appState.currentScript.updatedAt = new Date().toISOString();
}

function scheduleAutosave() {
  if (!appState.currentScript) return;
  clearTimeout(autosaveTimer);
  setSaveStatus("Guardando…", "warn");

  autosaveTimer = setTimeout(async () => {
    try {
      touchCurrentScript();
      await putScript(appState.currentScript);
      setSaveStatus("Guardado", "ok");
      renderLibraryIfOpen();
    } catch {
      setSaveStatus("Error al guardar", "warn");
    }
  }, 300);
}

function renderWritingModeButton() {
  const btn = document.getElementById("writingModeBtn");
  if (!btn) return;

  btn.textContent = appState.writingMode ? "Focus: ON" : "Focus: OFF";
  btn.className = appState.writingMode ? "toggle-on" : "toggle-off";
}

function renderTopbarTitle() {
  const el = document.getElementById("topbarScriptTitle");
  if (!el) return;

  const title = appState.currentScript?.project?.title?.trim();
  el.textContent = title || "Sin título";
}

function toggleWritingMode() {
  appState.writingMode = !appState.writingMode;
  renderWritingModeButton();
}

function toggleExportMenu() {
  const menu = document.getElementById("exportMenu");
  if (!menu) return;
  menu.classList.toggle("open");
}

function closeExportMenu() {
  const menu = document.getElementById("exportMenu");
  if (!menu) return;
  menu.classList.remove("open");
}

function maybeTypewriter(element) {
  document.querySelectorAll(".writing-active").forEach(el => el.classList.remove("writing-active"));
  if (!appState.writingMode || !element) return;

  const target = element.closest(".block") || element.closest(".section") || element;
  if (target && target.classList) target.classList.add("writing-active");

  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function headingString(scene) {
  return `${scene.heading.type} ${scene.heading.location} - ${scene.heading.time}`;
}

function collectCharacterNames(excludeBlockId = null) {
  const names = [];
  if (!appState.currentScript) return names;

  appState.currentScript.scenes.forEach(scene => {
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

  if (sceneDraft) {
    sceneDraft.blocks.forEach(block => {
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
  let lines = 2;

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

  return lines + 1;
}

function paginateScenes() {
  if (!appState.currentScript) return [];

  const maxLines = 52;
  const pages = [];
  let current = [];
  let currentLines = 0;

  appState.currentScript.scenes.forEach((scene, idx) => {
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

function miniBtn(label, fn) {
  const button = document.createElement("button");
  button.className = "small";
  button.textContent = label;
  button.onclick = fn;
  return button;
}

function appendLine(parent, text, cls = "") {
  if (text === undefined || text === null || text === "") return;
  const line = document.createElement("div");
  line.className = `script-line ${cls}`.trim();
  line.textContent = text;
  parent.appendChild(line);
}

function renderTitlePage(container) {
  const shell = document.createElement("div");
  shell.className = "page-shell";

  const meta = document.createElement("div");
  meta.className = "page-meta";
  meta.innerHTML = `<span>Carátula</span><span>${escapeHtml(appState.currentScript.project.version || "")}</span>`;

  const page = document.createElement("div");
  page.className = "page";

  const titlePage = document.createElement("div");
  titlePage.className = "title-page";
  titlePage.onclick = () => openProjectModal();

  const actions = document.createElement("div");
  actions.className = "title-page-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "small";
  editBtn.type = "button";
  editBtn.textContent = "Editar carátula";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openProjectModal();
  };

  actions.appendChild(editBtn);

  const p = appState.currentScript.project;

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = p.title || "UNTITLED PROJECT";

  const byline = document.createElement("div");
  byline.className = "byline";
  byline.textContent = "por";

  const author = document.createElement("div");
  author.className = "author";
  author.textContent = p.author || "Autor sin definir";

  const metaBox = document.createElement("div");
  metaBox.className = "meta";
  metaBox.innerHTML = `
    ${p.basedOn ? `Basado en: ${escapeHtml(p.basedOn)}<br>` : ""}
    ${p.version ? `Versión: ${escapeHtml(p.version)}<br>` : ""}
    ${p.date ? `Fecha: ${escapeHtml(p.date)}<br>` : ""}
    ${p.location ? `${escapeHtml(p.location)}<br>` : ""}
    ${p.notes ? `<br>${escapeHtml(p.notes)}` : ""}
  `;

  const contactBox = document.createElement("div");
  contactBox.className = "title-contact";
  contactBox.innerHTML = `
    ${p.email ? `${escapeHtml(p.email)}<br>` : ""}
    ${p.phone ? `${escapeHtml(p.phone)}<br>` : ""}
    ${p.contactNotes ? `${escapeHtml(p.contactNotes)}` : ""}
  `;

  const center = document.createElement("div");
  center.className = "title-center";

  center.appendChild(title);
  center.appendChild(byline);
  center.appendChild(author);
  center.appendChild(metaBox);

  titlePage.appendChild(actions);
  titlePage.appendChild(center);
  titlePage.appendChild(contactBox);

  page.appendChild(titlePage);
  shell.appendChild(meta);
  shell.appendChild(page);
  container.appendChild(shell);
}

function renderPages() {
  const container = document.getElementById("pagesContainer");
  container.innerHTML = "";
  if (!appState.currentScript) return;

  renderTitlePage(container);

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
        if (block.type === "character") appendLine(wrap, [block.name, block.suffix].filter(Boolean).join(" "), "sp-character");
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

    page.appendChild(content);
    shell.appendChild(meta);
    shell.appendChild(page);
    container.appendChild(shell);
  });
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

function renderSceneList() {
  const el = document.getElementById("sceneList");
  el.innerHTML = "";
  if (!appState.currentScript) return;

  appState.currentScript.scenes.forEach((scene, i) => {
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

function renderApp() {
  renderWritingModeButton();
  renderTopbarTitle();
  renderSceneList();
  renderPages();
  renderGlossary();
}

function moveScene(id, dir) {
  const scenes = appState.currentScript.scenes;
  const i = scenes.findIndex(s => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= scenes.length) return;

  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  renderApp();
  scheduleAutosave();
}

function deleteScene(id) {
  if (appState.currentScript.scenes.length === 1) return;
  appState.currentScript.scenes = appState.currentScript.scenes.filter(s => s.id !== id);
  renderApp();
  scheduleAutosave();
}

function openProjectModal(isNew = false) {
  projectDraft = clone(appState.currentScript ? appState.currentScript.project : createEmptyProject());
  projectDraft.location = projectDraft.location || "Lima, Perú";
  projectDraft.date = formatDateToDDMMYYYY(projectDraft.date);
  projectDraft.email = projectDraft.email || "";
  projectDraft.phone = projectDraft.phone || "";
  projectDraft.contactNotes = projectDraft.contactNotes || "";

  document.getElementById("projectModalTitle").textContent = isNew ? "Nuevo proyecto" : "Proyecto";

  const body = document.getElementById("projectModalBody");
  body.innerHTML = `
    <div class="section">
      <div class="section-title">Datos del proyecto</div>
      <div class="help">Estos datos aparecen en el bloque principal de la carátula.</div>
      <div class="grid2">
        <input id="pTitle" class="field" placeholder="Título del proyecto" value="${escapeHtml(projectDraft.title)}">
        <input id="pAuthor" class="field" placeholder="Autor" value="${escapeHtml(projectDraft.author)}">
        <input id="pBasedOn" class="field" placeholder="Basado en / creado por (opcional)" value="${escapeHtml(projectDraft.basedOn)}">
        <input id="pVersion" class="field" placeholder="Versión (ej: Draft 2)" value="${escapeHtml(projectDraft.version)}">
        <input id="pDate" class="field" placeholder="Fecha" value="${escapeHtml(projectDraft.date)}">
        <input id="pLocation" class="field" placeholder="Localidad" value="${escapeHtml(projectDraft.location || "")}">
      </div>
      <div class="section" style="margin-top:12px;">
        <textarea id="pNotes" placeholder="Logline o nota breve (opcional)">${escapeHtml(projectDraft.notes)}</textarea>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Contacto para la carátula</div>
      <div class="help">Estos datos aparecen en la parte inferior de la carátula.</div>
      <div class="grid2">
        <input id="pEmail" class="field" placeholder="autor@email.com" value="${escapeHtml(projectDraft.email || "")}">
        <input id="pPhone" class="field" placeholder="+51 999 999 999" value="${escapeHtml(projectDraft.phone || "")}">
      </div>
      <div class="section" style="margin-top:12px;">
        <input id="pContactNotes" class="field" placeholder="Representación o información adicional (opcional)" value="${escapeHtml(projectDraft.contactNotes || "")}">
      </div>
    </div>
  `;

  document.getElementById("projectModal").style.display = "flex";
}

function closeProjectModal() {
  document.getElementById("projectModal").style.display = "none";
  projectDraft = null;
}

async function saveProjectModal() {
  projectDraft.title = document.getElementById("pTitle").value.trim();
  projectDraft.author = document.getElementById("pAuthor").value.trim();
  projectDraft.basedOn = document.getElementById("pBasedOn").value.trim();
  projectDraft.version = document.getElementById("pVersion").value.trim();
  projectDraft.date = formatDateToDDMMYYYY(document.getElementById("pDate").value.trim());
  projectDraft.location = document.getElementById("pLocation").value.trim();
  projectDraft.email = document.getElementById("pEmail").value.trim();
  projectDraft.phone = document.getElementById("pPhone").value.trim();
  projectDraft.contactNotes = document.getElementById("pContactNotes").value.trim();
  projectDraft.notes = document.getElementById("pNotes").value.trim();

  if (!appState.currentScript) {
    appState.currentScript = createNewScriptShell();
  }

  appState.currentScript.project = clone(projectDraft);
  touchCurrentScript();
  await putScript(appState.currentScript);
  closeProjectModal();
  renderApp();
  setSaveStatus("Guardado", "ok");
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

function contextHelp(items) {
  const box = document.createElement("div");
  box.className = "inline-help";
  box.innerHTML = items.map(item => `${item.v} — ${item.d}`).join("<br>");
  return box;
}

function renderCharacterSuggestions(containerId, excludeBlockId, currentValue, onSelect) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = "";

  const names = collectCharacterNames(excludeBlockId)
    .filter(name => !currentValue || name.includes(currentValue.toUpperCase()))
    .slice(0, 6);

  names.forEach(name => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = name;
    chip.onclick = () => onSelect(name);
    box.appendChild(chip);
  });
}

function renderSceneBlock(block, index) {
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
  actions.appendChild(miniBtn("↑", () => moveSceneBlock(index, -1)));
  actions.appendChild(miniBtn("↓", () => moveSceneBlock(index, 1)));
  actions.appendChild(miniBtn("Eliminar", () => deleteSceneBlock(index)));

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
    el.appendChild(input);

    const select = document.createElement("select");
    CHARACTER_SUFFIXES.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.v;
      option.textContent = `${opt.v || "none"} — ${opt.d}`;
      option.selected = opt.v === (block.suffix || "");
      select.appendChild(option);
    });
    el.appendChild(select);
    el.appendChild(contextHelp(CHARACTER_SUFFIXES.filter(item => item.v)));

    const suggestionsId = "suggestions-" + crypto.randomUUID();
    const suggestions = document.createElement("div");
    suggestions.id = suggestionsId;
    suggestions.className = "suggestions";
    el.appendChild(suggestions);

    input.oninput = e => {
      block.name = e.target.value.toUpperCase();
      renderCharacterSuggestions(suggestionsId, block.id, block.name, selected => {
        block.name = selected;
        renderSceneModal();
      });
      maybeTypewriter(e.target);
    };

    select.onchange = e => {
      block.suffix = e.target.value;
      maybeTypewriter(e.target);
    };

    renderCharacterSuggestions(suggestionsId, block.id, block.name, selected => {
      block.name = selected;
      renderSceneModal();
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
    el.appendChild(contextHelp(TRANSITIONS));
  }

  return el;
}

function renderSceneModal() {
  const body = document.getElementById("sceneModalBody");
  body.innerHTML = "";

  const headingSection = document.createElement("div");
  headingSection.className = "section";
  headingSection.innerHTML = `
    <div class="section-title">Encabezado</div>
    <div class="help">Define dónde y cuándo ocurre la escena.</div>
    <div class="grid3">
      <select id="mType"></select>
      <input id="mLoc" class="field" placeholder="Escribe el lugar de la escena (ej: APARTMENT, CITY STREET)" value="${escapeHtml(sceneDraft.heading.location)}">
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
    option.selected = v === sceneDraft.heading.type;
    typeSel.appendChild(option);
  });
  typeSel.onchange = e => {
    sceneDraft.heading.type = e.target.value;
    maybeTypewriter(e.target);
  };

  const timeSel = headingSection.querySelector("#mTime");
  TIMES.forEach(v => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    option.selected = v === sceneDraft.heading.time;
    timeSel.appendChild(option);
  });
  timeSel.onchange = e => {
    sceneDraft.heading.time = e.target.value;
    maybeTypewriter(e.target);
  };

  headingSection.querySelector("#mLoc").oninput = e => {
    sceneDraft.heading.location = e.target.value.toUpperCase();
    maybeTypewriter(e.target);
  };

  const descSection = document.createElement("div");
  descSection.className = "section";
  descSection.innerHTML = `
    <div class="section-title">Descripción</div>
    <div class="help">Describe el ambiente inicial. Solo lo que se puede ver u oír.</div>
    <textarea id="mDesc" placeholder="Describe el ambiente o situación inicial de la escena.">${escapeHtml(sceneDraft.description)}</textarea>
  `;
  descSection.querySelector("#mDesc").oninput = e => {
    sceneDraft.description = e.target.value;
    maybeTypewriter(e.target);
  };
  body.appendChild(descSection);

  const blocksSection = document.createElement("div");
  blocksSection.className = "section";
  blocksSection.innerHTML = `
    <div class="section-title">Bloques</div>
    <div class="help">Agrega acciones, personajes, diálogos, acotaciones y transiciones.</div>
  `;

  sceneDraft.blocks.forEach((block, index) => {
    blocksSection.appendChild(renderSceneBlock(block, index));
  });

  const add = document.createElement("div");
  add.innerHTML = `
    <button type="button" onclick="addSceneBlock('action')">+ Acción</button>
    <button type="button" onclick="addSceneBlock('character')">+ Personaje</button>
    <button type="button" onclick="addSceneBlock('dialogue')">+ Diálogo</button>
    <button type="button" onclick="addSceneBlock('parenthetical')">+ Acotación</button>
    <button type="button" onclick="addSceneBlock('transition')">+ Transición</button>
  `;
  blocksSection.appendChild(add);
  body.appendChild(blocksSection);
}

function openSceneModal(mode, sceneId = null) {
  sceneDraft = mode === "edit"
    ? clone(appState.currentScript.scenes.find(scene => scene.id === sceneId))
    : {
        id: crypto.randomUUID(),
        heading: { type: "INT.", location: "LOCATION", time: "DAY" },
        description: "",
        blocks: []
      };

  document.getElementById("sceneModalTitle").textContent = mode === "edit" ? "Editar escena" : "Agregar escena";
  renderSceneModal();
  document.getElementById("sceneModal").style.display = "flex";
}

function closeSceneModal() {
  document.getElementById("sceneModal").style.display = "none";
  sceneDraft = null;
}

function addSceneBlock(type) {
  const block = { id: crypto.randomUUID(), type };
  if (type === "action" || type === "dialogue" || type === "parenthetical") block.text = "";
  if (type === "character") {
    block.name = "";
    block.suffix = "";
  }
  if (type === "transition") block.value = "CUT TO:";
  sceneDraft.blocks.push(block);
  renderSceneModal();
}

function moveSceneBlock(index, dir) {
  const j = index + dir;
  if (j < 0 || j >= sceneDraft.blocks.length) return;
  [sceneDraft.blocks[index], sceneDraft.blocks[j]] = [sceneDraft.blocks[j], sceneDraft.blocks[index]];
  renderSceneModal();
}

function deleteSceneBlock(index) {
  sceneDraft.blocks.splice(index, 1);
  renderSceneModal();
}

async function saveSceneModal() {
  const idx = appState.currentScript.scenes.findIndex(scene => scene.id === sceneDraft.id);
  if (idx >= 0) {
    appState.currentScript.scenes[idx] = clone(sceneDraft);
  } else {
    appState.currentScript.scenes.push(clone(sceneDraft));
  }

  closeSceneModal();
  renderApp();
  scheduleAutosave();
}

async function openLibraryModal() {
  document.getElementById("libraryModal").style.display = "flex";
  await renderLibraryList();
}

function closeLibraryModal() {
  document.getElementById("libraryModal").style.display = "none";
}

async function renderLibraryList() {
  const scripts = await getAllScripts();
  const list = document.getElementById("libraryList");
  list.innerHTML = "";

  if (!scripts.length) {
    list.innerHTML = '<div class="muted">No hay guiones guardados aún.</div>';
    return;
  }

  scripts.forEach(script => {
    const div = document.createElement("div");
    div.className = "library-item";
    div.innerHTML = `
      <div class="library-item-title">${escapeHtml(script.project.title || "Sin título")}</div>
      <div class="library-item-meta">
        ${escapeHtml(script.project.author || "Autor sin definir")} ·
        ${escapeHtml(script.project.version || "")} ·
        Última edición: ${new Date(script.updatedAt).toLocaleString()}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "library-item-actions";
    actions.appendChild(miniBtn("Abrir", () => openScript(script.id)));
    actions.appendChild(miniBtn("Duplicar versión", () => duplicateScript(script.id)));
    actions.appendChild(miniBtn("Exportar", () => exportSingleScript(script)));
    actions.appendChild(miniBtn("Eliminar", () => removeScript(script.id)));

    div.appendChild(actions);
    list.appendChild(div);
  });
}

async function renderLibraryIfOpen() {
  const modal = document.getElementById("libraryModal");
  if (modal.style.display === "flex") {
    await renderLibraryList();
  }
}

async function openScript(id) {
  const script = await getScript(id);
  if (!script) return;

  if (!script.project.location) {
    script.project.location = "Lima, Perú";
  }
  if (script.project.email === undefined) {
    script.project.email = "";
  }
  if (script.project.phone === undefined) {
    script.project.phone = "";
  }
  if (script.project.contactNotes === undefined) {
    script.project.contactNotes = "";
  }

  await putScript(script);

  appState.currentScript = script;
  renderApp();
  closeLibraryModal();
  setSaveStatus("Guardado", "ok");
}

async function removeScript(id) {
  if (!confirm("¿Eliminar este guion?")) return;
  await deleteScriptById(id);

  if (appState.currentScript && appState.currentScript.id === id) {
    const remaining = await getAllScripts();
    if (remaining.length) {
      appState.currentScript = remaining[0];
    } else {
      appState.currentScript = createNewScriptShell();
      await putScript(appState.currentScript);
    }
    renderApp();
  }

  await renderLibraryList();
}

async function duplicateScript(id) {
  const original = await getScript(id);
  if (!original) return;

  const copy = structuredClone(original);
  copy.id = crypto.randomUUID();
  copy.project.version = copy.project.version ? `${copy.project.version} (copy)` : "Copy";
  copy.updatedAt = new Date().toISOString();
  copy.createdAt = copy.createdAt || copy.updatedAt;

  await putScript(copy);
  await renderLibraryList();
}

function exportSingleScript(script) {
  const blob = new Blob([JSON.stringify(script, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safeTitle = (script.project.title || "script").replace(/[^\w\-]+/g, "-").toLowerCase();
  a.download = `${safeTitle}.json`;
  a.click();
}

function exportCurrentScriptJSON() {
  closeExportMenu();
  if (!appState.currentScript) return;
  exportSingleScript(appState.currentScript);
}

async function exportLibraryJSON() {
  closeExportMenu();
  const scripts = await getAllScripts();

  const payload = {
    app: "Script Maker for Creative Dummies",
    version: 1,
    exportedAt: new Date().toISOString(),
    scripts
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `script-maker-library-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

async function importLibraryJSON(file) {
  const text = await file.text();
  const payload = JSON.parse(text);

  // Caso 1: biblioteca completa
  if (payload && Array.isArray(payload.scripts)) {
    const shouldReplace = confirm("Aceptar = reemplazar biblioteca actual. Cancelar = fusionar con la importada.");
    if (shouldReplace) {
      await replaceLibrary(payload.scripts);
    } else {
      await mergeLibrary(payload.scripts);
    }

    const scripts = await getAllScripts();
    appState.currentScript = scripts[0] || createNewScriptShell();
    if (!scripts.length) {
      await putScript(appState.currentScript);
    }

    renderApp();
    await renderLibraryList();
    return;
  }

  // Caso 2: guion individual
  if (payload && payload.project && Array.isArray(payload.scenes)) {
    const scriptToImport = structuredClone(payload);

    if (!scriptToImport.id) {
      scriptToImport.id = crypto.randomUUID();
    } else {
      const existing = await getScript(scriptToImport.id);
      if (existing) {
        scriptToImport.id = crypto.randomUUID();
      }
    }

    const now = new Date().toISOString();
    scriptToImport.createdAt = scriptToImport.createdAt || now;
    scriptToImport.updatedAt = now;

    if (!scriptToImport.project.location) {
      scriptToImport.project.location = "Lima, Perú";
    }
    if (scriptToImport.project.email === undefined) {
      scriptToImport.project.email = "";
    }
    if (scriptToImport.project.phone === undefined) {
      scriptToImport.project.phone = "";
    }
    if (scriptToImport.project.contactNotes === undefined) {
      scriptToImport.project.contactNotes = "";
    }

    await putScript(scriptToImport);
    appState.currentScript = scriptToImport;

    renderApp();
    await renderLibraryList();
    closeLibraryModal();
    setSaveStatus("Guardado", "ok");
    return;
  }

  alert("El archivo no parece un JSON válido de guion ni de biblioteca.");
}

function exportTXT() {
  closeExportMenu();
  if (!appState.currentScript) return;

  let out = "";
  const p = appState.currentScript.project;

  out += `${p.title || "UNTITLED PROJECT"}\n`;
  out += `${p.author ? "por " + p.author : ""}\n\n`;

  appState.currentScript.scenes.forEach((scene, i) => {
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

  const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safeTitle = (p.title || "script").replace(/[^\w\-]+/g, "-").toLowerCase();
  a.download = `${safeTitle}.txt`;
  a.click();
}

async function handleNewScript() {
  appState.currentScript = createNewScriptShell();
  openProjectModal(true);
  closeLibraryModal();
}

async function bootstrap() {
  try {
    await openDB();
    const scripts = await getAllScripts();

    if (scripts.length) {
      if (!scripts[0].project.location) {
        scripts[0].project.location = "Lima, Perú";
      }
      if (scripts[0].project.email === undefined) {
        scripts[0].project.email = "";
      }
      if (scripts[0].project.phone === undefined) {
        scripts[0].project.phone = "";
      }
      if (scripts[0].project.contactNotes === undefined) {
        scripts[0].project.contactNotes = "";
      }

      await putScript(scripts[0]);

      appState.currentScript = scripts[0];
      renderApp();
      setSaveStatus("Guardado", "ok");
    } else {
      appState.currentScript = createNewScriptShell();
      await putScript(appState.currentScript);
      renderApp();
      setSaveStatus("Guardado", "ok");
      openProjectModal(true);
    }
  } catch (err) {
    console.error(err);
    setSaveStatus("No se pudo abrir la base local", "warn");
  }

  document.getElementById("importLibraryInput").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importLibraryJSON(file);
    e.target.value = "";
  });

  document.addEventListener("click", (e) => {
    const wrap = document.querySelector(".menu-wrap");
    const menu = document.getElementById("exportMenu");
    if (!wrap || !menu) return;
    if (!wrap.contains(e.target)) {
      menu.classList.remove("open");
    }
  });
}

bootstrap();
