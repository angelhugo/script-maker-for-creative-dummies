let state = {
scenes: [],
writingMode:false
}

function uid(){
return Math.random().toString(36).slice(2)
}

function newDocument(){

state.scenes=[
{
id:uid(),
heading:{type:"EXT.",location:"CITY STREET",time:"NIGHT"},
description:"The street is empty.",
blocks:[
{id:uid(),type:"action",text:"John walks into the street."},
{id:uid(),type:"character",name:"JOHN",suffix:""},
{id:uid(),type:"dialogue",text:"I shouldn't be here."}
]
}
]

render()

}

function headingString(s){
return `${s.heading.type} ${s.heading.location} - ${s.heading.time}`
}

function render(){

renderScenes()
renderPages()
renderGlossary()

}

function renderScenes(){

const el=document.getElementById("sceneList")
el.innerHTML=""

state.scenes.forEach((s,i)=>{

const d=document.createElement("div")

d.innerHTML=`${i+1}. ${headingString(s)}`

d.onclick=()=>openSceneModal("edit",s.id)

el.appendChild(d)

})

}

function renderPages(){

const container=document.getElementById("pagesContainer")
container.innerHTML=""

const page=document.createElement("div")
page.className="page"

const content=document.createElement("div")
content.className="page-content"

state.scenes.forEach(scene=>{

const block=document.createElement("div")
block.className="scene-block"

appendLine(block,headingString(scene),"sp-heading")
appendLine(block,scene.description)

scene.blocks.forEach(b=>{

if(b.type==="action") appendLine(block,b.text)

if(b.type==="character")
appendLine(block,b.name,"sp-character")

if(b.type==="dialogue")
appendLine(block,b.text,"sp-dialogue")

})

content.appendChild(block)

})

page.appendChild(content)

container.appendChild(page)

}

function appendLine(parent,text,cls=""){

const line=document.createElement("div")

line.className="script-line "+cls

line.textContent=text

parent.appendChild(line)

}

function renderGlossary(){

const g=document.getElementById("glossary")

g.innerHTML=""

GLOSSARY.forEach(item=>{

const d=document.createElement("div")

d.textContent=item

g.appendChild(d)

})

}

function toggleWritingMode(){

state.writingMode=!state.writingMode

document.getElementById("writingModeBtn").textContent=
`Modo escritura: ${state.writingMode?"ON":"OFF"}`

}

function exportTXT(){

let out=""

state.scenes.forEach(s=>{

out+=headingString(s)+"\n\n"

out+=s.description+"\n\n"

})

const blob=new Blob([out])

const a=document.createElement("a")

a.href=URL.createObjectURL(blob)

a.download="script.txt"

a.click()

}

newDocument()
