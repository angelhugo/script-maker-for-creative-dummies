let blocks = [];

const types = {
  locacion: "Scene Heading",
  descripcion: "Action",
  personaje: "Character",
  parentetico: "Parenthetical",
  dialogo: "Dialogue",
  transicion: "Transition"
};

const abbreviations = [
  { term: "INT.", meaning: "Interior. Scene takes place inside." },
  { term: "EXT.", meaning: "Exterior. Scene takes place outside." },
  { term: "(V.O.)", meaning: "Voice over." },
  { term: "(O.S.)", meaning: "Off screen voice." },
  { term: "(CONT'D)", meaning: "Character continues speaking after interruption." },
  { term: "(MORE)", meaning: "Dialogue continues on the next page." },
  { term: "POV", meaning: "Point of view shot." },
  { term: "SUPER", meaning: "Text superimposed on screen." },
  { term: "CONTINUOUS", meaning: "Action continues without time break." },
  { term: "FADE IN:", meaning: "Beginning transition." },
  { term: "FADE OUT.", meaning: "Ending transition." },
  { term: "CUT TO:", meaning: "Scene transition." }
];

function defaultText(type) {
  const placeholders = {
    locacion: "INT. APARTMENT - NIGHT",
    descripcion: "A laptop glows in the dark. The cursor waits for the first line.",
    personaje: "ANGEL",
    parentetico: "(quietly)",
    dialogo: "This finally looks like a real screenplay.",
    transicion: "CUT TO:"
  };
  return placeholders[type] || "";
}

function formatPreviewText(type, text) {
  if (["locacion", "personaje", "transicion"].includes(type)) {
    return text.toUpperCase();
  }
  return text;
}

function addBlock(type = "descripcion") {
  blocks.push({
    id: Date.now() + Math.random(),
    type,
    text: defaultText(type)
  });
  render();
}

function removeBlock(id) {
  blocks = blocks.filter((b) => b.id !== id);
  render();
}

function updateBlock(id, field, value) {
  blocks = blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b));
  renderPreview();
}

function render() {
  const container = document.getElementById("blocks");
  container.innerHTML = "";

  blocks.forEach((block) => {
    const div = document.createElement("div");
    div.className = "block";

    const top = document.createElement("div");
    top.className = "block-top";

    const select = document.createElement("select");

    Object.entries(types).forEach(([key, label]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      if (block.type === key) option.selected = true;
      select.appendChild(option);
    });

    select.onchange = (e) => {
      updateBlock(block.id, "type", e.target.value);
      render();
    };

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Delete";
    removeBtn.onclick = () => removeBlock(block.id);

    top.appendChild(select);
    top.appendChild(removeBtn);

    const textarea = document.createElement("textarea");
    textarea.value = block.text;
    textarea.oninput = (e) => updateBlock(block.id, "text", e.target.value);

    div.appendChild(top);
    div.appendChild(textarea);
    container.appendChild(div);
  });

  renderPreview();
}

function renderPreview() {
  const preview = document.getElementById("preview");
  preview.innerHTML = "";

  blocks.forEach((block) => {
    const el = document.createElement("div");
    el.className = `preview-block preview-${block.type}`;
    el.textContent = formatPreviewText(block.type, block.text);
    preview.appendChild(el);
  });
}

function exportScript() {
  let output = "";

  blocks.forEach((b) => {
    output += formatPreviewText(b.type, b.text) + "\n\n";
  });

  const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "screenplay.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadAbbreviations() {
  const list = document.getElementById("abbrList");
  list.innerHTML = "";

  abbreviations.forEach((a) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${a.term}</strong><br>${a.meaning}`;
    list.appendChild(li);
  });
}

function filterAbbr() {
  const q = document.getElementById("search").value.toLowerCase();
  const items = document.querySelectorAll("#abbrList li");

  items.forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? "block" : "none";
  });
}

function loadExample() {
  blocks = [
    { id: 1, type: "locacion", text: "INT. NEWSROOM - MORNING" },
    { id: 2, type: "descripcion", text: "Phones vibrate. Screens flicker. Nobody has slept enough." },
    { id: 3, type: "personaje", text: "EDITOR" },
    { id: 4, type: "dialogo", text: "I want page one rewritten before the coffee gets cold." },
    { id: 5, type: "personaje", text: "REPORTER" },
    { id: 6, type: "parentetico", text: "(without looking up)" },
    { id: 7, type: "dialogo", text: "Then you'd better pray for slow coffee." },
    { id: 8, type: "transicion", text: "CUT TO:" }
  ];
  render();
}

loadAbbreviations();
loadExample();
