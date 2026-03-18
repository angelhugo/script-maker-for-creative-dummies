let state = { scenes: [], writingMode: false };
let modalScene = null;

function uid(){
  return Math.random().toString(36).slice(2);
}

function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

function newDocument(){

  state.scenes = [

    {
      id: uid(),
      heading:{ type:"EXT.", location:"CITY STREET", time:"NIGHT"},
      description:"The street is empty.",
      blocks:[
        {id:uid(), type:"action", text:"John walks into the street."},
        {id:uid(), type:"character", name:"JOHN", suffix:""},
        {id:uid(), type:"dialogue", text:"I shouldn't be here."}
      ]
    },

    {
      id:uid(),
      heading:{type:"INT.",location:"NEWSROOM",time:"DAY"},
      description:"The newsroom is quiet.",
      blocks:[
        {id:uid(),type:"character",name:"EDITOR",suffix:""},
        {id:uid(),type:"dialogue",text:"Give me page one before the coffee gets cold."}
      ]
    }

  ];

  render();
}

function headingString(scene){
  return `${scene.heading.type} ${scene.heading.location} - ${scene.heading.time}`;
}

function render(){
  renderWritingModeButton();
  renderScenes();
  renderPages();
  renderGlossary();
}

function renderWritingModeButton(){

  const btn=document.getElementById("writingModeBtn");
  const help=document.getElementById("writingModeHelp");

  btn.textContent=`Modo escritura: ${state.writingMode?"ON":"OFF"}`;
  btn.className=state.writingMode?"toggle-on":"toggle-off";

  help.textContent = state.writingMode
    ? "Modo escritura: el bloque activo del modal se recentra."
    : "Modo normal: el modal no recentra el bloque activo.";
}

function toggleWritingMode(){
  state.writingMode=!state.writingMode;
  renderWritingModeButton();
}

function renderScenes(){

  const el=document.getElementById("sceneList");
  el.innerHTML="";

  state.scenes.forEach((scene,i)=>{

    const div=document.createElement("div");

    div.innerHTML=`
      <strong>${i+1}. ${headingString(scene)}</strong>
      <div class="muted">Escena ${i+1}</div>
    `;

    const actions=document.createElement("div");
    actions.className="scene-list-actions";

    actions.appendChild(miniBtn("Editar",()=>openSceneModal("edit",scene.id)));
    actions.appendChild(miniBtn("↑",()=>moveScene(scene.id,-1)));
    actions.appendChild(miniBtn("↓",()=>moveScene(scene.id,1)));
    actions.appendChild(miniBtn("Eliminar",()=>deleteScene(scene.id)));

    div.appendChild(actions);
    el.appendChild(div);
  });

}

function miniBtn(label,fn){

  const b=document.createElement("button");
  b.className="small";
  b.textContent=label;
  b.onclick=fn;

  return b;
}

function moveScene(id,dir){

  const i=state.scenes.findIndex(s=>s.id===id);
  const j=i+dir;

  if(j<0 || j>=state.scenes.length) return;

  [state.scenes[i],state.scenes[j]]=[state.scenes[j],state.scenes[i]];

  render();
}

function deleteScene(id){

  if(state.scenes.length===1) return;

  state.scenes=state.scenes.filter(s=>s.id!==id);

  render();
}

function renderPages(){

  const container=document.getElementById("pagesContainer");
  container.innerHTML="";

  const page=document.createElement("div");
  page.className="page";

  const content=document.createElement("div");
  content.className="page-content";

  state.scenes.forEach((scene,i)=>{

    const block=document.createElement("div");
    block.className="scene-block";

    const hover=document.createElement("div");
    hover.className="scene-hover";

    hover.appendChild(miniBtn("Editar",()=>openSceneModal("edit",scene.id)));

    block.appendChild(hover);

    appendLine(block,headingString(scene),"sp-heading");

    appendLine(block,scene.description);

    scene.blocks.forEach(b=>{

      if(b.type==="action") appendLine(block,b.text);

      if(b.type==="character")
        appendLine(block,[b.name,b.suffix].filter(Boolean).join(" "),"sp-character");

      if(b.type==="dialogue")
        appendLine(block,b.text,"sp-dialogue");

      if(b.type==="parenthetical")
        appendLine(block,b.text,"sp-parenthetical");

      if(b.type==="transition")
        appendLine(block,b.value,"sp-transition");

    });

    if(i===state.scenes.length-1){

      const add=document.createElement("div");
      add.className="add-scene";
      add.textContent="+ Agregar escena";
      add.onclick=()=>openSceneModal("new");

      block.appendChild(add);
    }

    content.appendChild(block);

  });

  page.appendChild(content);
  container.appendChild(page);
}

function appendLine(parent,text,cls=""){

  if(!text) return;

  const line=document.createElement("div");

  line.className="script-line "+cls;

  line.textContent=text;

  parent.appendChild(line);
}

function openSceneModal(mode,id=null){

  modalScene = mode==="edit"
    ? clone(state.scenes.find(s=>s.id===id))
    : {
        id:uid(),
        heading:{type:"INT.",location:"LOCATION",time:"DAY"},
        description:"",
        blocks:[]
      };

  document.getElementById("modalTitle").textContent=
    mode==="edit"?"Editar escena":"Agregar escena";

  document.getElementById("modal").style.display="flex";

  renderModal();
}

function closeModal(){

  document.getElementById("modal").style.display="none";

  modalScene=null;
}

function renderModal(){

  const body=document.getElementById("modalBody");

  body.innerHTML="";

  const headingSection=document.createElement("div");

  headingSection.className="section";

  headingSection.innerHTML=`
    <div class="section-title">Encabezado</div>
    <div class="help">Define dónde y cuándo ocurre la escena.</div>

    <div class="grid3">
      <select id="mType"></select>

      <input id="mLoc"
      class="field"
      placeholder="Escribe el lugar de la escena (ej: APARTMENT, CITY STREET)"
      value="${modalScene.heading.location}">

      <select id="mTime"></select>
    </div>
  `;

  body.appendChild(headingSection);

  const descSection=document.createElement("div");

  descSection.className="section";

  descSection.innerHTML=`
    <div class="section-title">Descripción</div>
    <div class="help">Describe el ambiente inicial. Solo lo que se puede ver u oír.</div>

    <textarea id="mDesc"
    placeholder="Describe el ambiente o situación inicial de la escena.">${modalScene.description}</textarea>
  `;

  body.appendChild(descSection);

}

function renderGlossary(){

  const g=document.getElementById("glossary");

  g.innerHTML="";

  GLOSSARY.forEach(item=>{

    const d=document.createElement("div");

    d.className="g-item";

    d.textContent=item;

    g.appendChild(d);

  });
}

function exportTXT(){

  let out="";

  state.scenes.forEach((scene,i)=>{

    out+=`${i+1}. ${headingString(scene)}\n\n`;

    out+=(scene.description||"")+"\n\n";

    scene.blocks.forEach(b=>{

      if(b.type==="action") out+=b.text+"\n";

      if(b.type==="character")
        out+=[b.name,b.suffix].filter(Boolean).join(" ")+"\n";

      if(b.type==="dialogue") out+=b.text+"\n";

      if(b.type==="parenthetical") out+=b.text+"\n";

      if(b.type==="transition") out+=b.value+"\n";

    });

    out+="\n";

  });

  const blob=new Blob([out]);

  const a=document.createElement("a");

  a.href=URL.createObjectURL(blob);

  a.download="script.txt";

  a.click();
}

function maybeTypewriter(element){

  if(!state.writingMode) return;

  const target=element.closest(".block") || element.closest(".section");

  if(!target) return;

  requestAnimationFrame(()=>{

    target.scrollIntoView({
      block:"center",
      behavior:"smooth"
    });

  });
}

newDocument();
