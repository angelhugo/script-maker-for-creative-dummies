const HEADING_TYPES = ["INT.", "EXT.", "INT./EXT."];
const TIMES = ["DAY", "NIGHT", "MORNING", "EVENING", "CONTINUOUS"];

const CHARACTER_SUFFIXES = [
  { v: "", d: "sin sufijo" },
  { v: "(V.O.)", d: "voz en off" },
  { v: "(O.S.)", d: "fuera de pantalla" },
  { v: "(CONT'D)", d: "continúa hablando" }
];

const TRANSITIONS = [
  { v: "CUT TO:", d: "corte directo" },
  { v: "DISSOLVE TO:", d: "disolvencia" },
  { v: "SMASH CUT TO:", d: "corte abrupto" },
  { v: "FADE IN:", d: "inicio de guion" },
  { v: "FADE OUT.", d: "fin de guion" }
];

const GLOSSARY = [
  "INT. — interior",
  "EXT. — exterior",
  "INT./EXT. — interior/exterior",
  "(V.O.) — voz en off",
  "(O.S.) — fuera de pantalla",
  "(CONT'D) — continúa hablando",
  "CUT TO: — corte directo",
  "DISSOLVE TO: — disolvencia",
  "SMASH CUT TO: — corte abrupto",
  "FADE IN: — inicio de guion",
  "FADE OUT. — fin de guion"
];

function createEmptyProject() {
  const now = new Date();
  const today = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  return {
    title: "",
    author: "",
    basedOn: "",
    version: "Draft 1",
    date: today,
    location: "Lima, Perú",
    email: "",
    phone: "",
    contactNotes: "",
    notes: ""
  };
}

function createDefaultScene() {
  return {
    id: crypto.randomUUID(),
    heading: { type: "EXT.", location: "CITY STREET", time: "NIGHT" },
    description: "The street is empty.",
    blocks: [
      { id: crypto.randomUUID(), type: "action", text: "John walks into the street." },
      { id: crypto.randomUUID(), type: "character", name: "JOHN", suffix: "" },
      { id: crypto.randomUUID(), type: "dialogue", text: "I shouldn't be here." }
    ]
  };
}

function createNewScriptShell() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    project: createEmptyProject(),
    scenes: [createDefaultScene()],
    createdAt: now,
    updatedAt: now
  };
}
