// app.js let appState={ currentScript:null, writingMode:false,
saveState:“idle” };

function toggleWritingMode(){
appState.writingMode=!appState.writingMode; const
btn=document.getElementById(“writingModeBtn”); btn.textContent=“Modo
escritura:”+(appState.writingMode?“ON”:“OFF”); }
