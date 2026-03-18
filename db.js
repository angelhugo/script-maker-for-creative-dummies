// db.js const DB_NAME=“scriptMakerDB”; const DB_VERSION=1; const
STORE_NAME=“scripts”;

let dbInstance=null;

function openDB(){ if(dbInstance) return Promise.resolve(dbInstance);

return new Promise((resolve,reject)=>{ const
request=indexedDB.open(DB_NAME,DB_VERSION);

request.onupgradeneeded=e=>{ const db=e.target.result;
if(!db.objectStoreNames.contains(STORE_NAME)){ const
store=db.createObjectStore(STORE_NAME,{keyPath:“id”});
store.createIndex(“updatedAt”,“updatedAt”,{unique:false}); } };

request.onsuccess=()=>{ dbInstance=request.result; resolve(dbInstance);
};

request.onerror=()=>reject(request.error); }); }
