let blocks = [];

const types = [
"Scene Heading",
"Action",
"Character",
"Dialogue",
"Parenthetical",
"Transition"
];

const abbreviations = [

{term:"INT.", meaning:"Interior location"},
{term:"EXT.", meaning:"Exterior location"},
{term:"V.O.", meaning:"Voice over narration"},
{term:"O.S.", meaning:"Off screen voice"},
{term:"CONT'D", meaning:"Character continues speaking"},
{term:"POV", meaning:"Point of view shot"},
{term:"SUPER", meaning:"Text over screen"},
{term:"CUT TO:", meaning:"Scene transition"},
{term:"FADE IN:", meaning:"Start of script"},
{term:"FADE OUT:", meaning:"End of script"}

];

function render(){

const container = document.getElementById("blocks");

container.innerHTML="";

blocks.forEach((block,i)=>{

let div=document.createElement("div");
div.className="block";

let select=document.createElement("select");

types.forEach(t=>{
let option=document.createElement("option");
option.value=t;
option.text=t;
if(block.type===t) option.selected=true;
select.appendChild(option);
});

select.onchange=(e)=>{block.type=e.target.value};

let textarea=document.createElement("textarea");
textarea.value=block.text;

textarea.oninput=(e)=>{
block.text=e.target.value;
}

div.appendChild(select);
div.appendChild(textarea);

container.appendChild(div);

});

}

function addBlock(){

blocks.push({
type:"Action",
text:""
});

render();

}

function exportScript(){

let output="";

blocks.forEach(b=>{
output+=b.text+"\n\n";
});

const blob=new Blob([output],{type:"text/plain"});

const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download="script.txt";
a.click();

}

function loadAbbreviations(){

const list=document.getElementById("abbrList");

abbreviations.forEach(a=>{

let li=document.createElement("li");
li.innerHTML="<b>"+a.term+"</b> — "+a.meaning;

list.appendChild(li);

});

}

function filterAbbr(){

let q=document.getElementById("search").value.toLowerCase();
let items=document.querySelectorAll("#abbrList li");

items.forEach(i=>{

if(i.textContent.toLowerCase().includes(q)){
i.style.display="block";
}else{
i.style.display="none";
}

});

}

loadAbbreviations();
addBlock();
