// data.js const HEADING_TYPES = [“INT.”, “EXT.”, “INT./EXT.”]; const
TIMES = [“DAY”, “NIGHT”, “MORNING”, “EVENING”, “CONTINUOUS”];

const CHARACTER_SUFFIXES = [ { v: ““, d:”sin sufijo” }, { v: “(V.O.)”,
d: “voz en off” }, { v: “(O.S.)”, d: “fuera de pantalla” }, { v:
“(CONT’D)”, d: “continúa hablando” }];

const TRANSITIONS = [ { v: “CUT TO:”, d: “corte directo” }, { v:
“DISSOLVE TO:”, d: “disolvencia” }, { v: “SMASH CUT TO:”, d: “corte
abrupto” }, { v: “FADE IN:”, d: “inicio de guion” }, { v: “FADE OUT.”,
d: “fin de guion” }];

function createEmptyProject() { const today = new
Date().toISOString().slice(0,10); return { title:““, author:”“,
basedOn:”“, contact:”“, version:”Draft 1”, date:today, notes:“” }; }
