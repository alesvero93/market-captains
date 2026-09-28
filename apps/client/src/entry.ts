const loading=document.querySelector('#app');
if(loading)loading.textContent='Caricamento arena…';
window.addEventListener('securitypolicyviolation',e=>{if(loading)loading.textContent=`Risorsa bloccata: ${e.violatedDirective}`;});
const moduleLoad=new URLSearchParams(window.location.search).has('lab')?import('./main.js'):import('./arena.js');
void moduleLoad.catch((error:unknown)=>{
  const app=document.querySelector('#app');
  if(app)app.textContent=`Impossibile avviare la demo. Ricarica la pagina. Dettaglio: ${error instanceof Error?error.message:'caricamento non riuscito'}`;
});
