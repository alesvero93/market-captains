import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(readFileSync(path.join(root,'submission.json'),'utf8'));
const checks=[];
function add(name,ok,detail){checks.push({name,status:ok?'present':'pending',detail});}
function httpsUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1'].includes(u.hostname);}catch{return false;}}
for(const [key,label] of Object.entries({repositoryUrl:'Repository pubblico',demoUrl:'Demo pubblica',videoUrl:'Video demo',buidlUrl:'BUIDL DoraHacks',socialPostUrl:'Post social'})){
  add(label,httpsUrl(config[key]),httpsUrl(config[key])?'URL configurato; disponibilità e contenuto da verificare manualmente.':'URL HTTPS mancante.');
}
add('Feedback API',typeof config.apiFeedback==='string'&&config.apiFeedback.trim().length>30,'Deve descrivere osservazioni reali, non risultati dei mock.');
const report=typeof config.humanPlaytestReport==='string'?config.humanPlaytestReport:'';
const reportPath=path.resolve(root,report);
const inside=reportPath.startsWith(root+path.sep)||reportPath.startsWith(root);
add('Playtest umano',!!report&&inside&&existsSync(reportPath),'Serve un rapporto compilato; il test automatico non lo sostituisce.');

let apiEvidence=false;
const evidencePath=path.join(root,'.data','cmc-evidence.json');
if(existsSync(evidencePath)){
  try{
    const evidence=JSON.parse(readFileSync(evidencePath,'utf8'));
    const {decodeQuotes}=await import('../apps/server/dist/market/normalize.js');
    const quotes=decodeQuotes(evidence.response,evidence.receivedAt);
    apiEvidence=evidence.endpoint==='/v3/cryptocurrency/quotes/latest'&&Number.isFinite(evidence.receivedAt)&&quotes.length===10&&Number(evidence.response?.status?.error_code??0)===0;
  }catch{/* Fail closed, never output provider response or credentials. */}
}
add('Risposta CMC reale salvata',apiEvidence,'Controllo locale di struttura e endpoint; provenienza, Basic e oscuramento da confermare nella revisione finale.');

// Inventory excludes runtime data, secrets, dependencies and original handoff material.
const excluded=new Set(['node_modules','dist','.git','.data','coverage','release']);
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(excluded.has(entry.name)||entry.name==='handoff'||(entry.name.startsWith('.env')&&entry.name!=='.env.example')||/\.(zip|log)$/.test(entry.name))continue;
  const full=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Symlink in release sources');
  if(entry.isDirectory())walk(full);else files.push(full);
}}
walk(root);files.sort();
const envFile=path.join(root,'apps/server/.env.local');
const rawKey=existsSync(envFile)?readFileSync(envFile,'utf8').match(/^[ \t]*CMC_API_KEY[ \t]*=[ \t]*([^\r\n]*)/m)?.[1]?.trim()??'':'';
const key=rawKey.replace(/^(['"])(.*)\1$/,'$2');
const manifest=files.map(file=>{const bytes=readFileSync(file);if(key.length>=8&&bytes.includes(Buffer.from(key)))throw Error('Configured credential found in candidate sources; export stopped.');return {path:path.relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};});
const fingerprint=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const result={generatedAt:new Date().toISOString(),project:config.project,track:config.track,readyForSubmission:false,
  note:'Local preparation only. Present means evidence is configured, not organizer approval or successful external verification.',checks,sourceFingerprint:fingerprint,sourceFiles:manifest.length};
const destination=path.join(root,'release');mkdirSync(destination,{recursive:true});
writeFileSync(path.join(destination,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(path.join(destination,'submission-status.json'),JSON.stringify(result,null,2)+'\n');
writeFileSync(path.join(destination,'SUBMISSION_STATUS.md'),`# MARKET CAPTAINS — stato consegna\n\nGenerato: ${result.generatedAt}\n\n**Preparazione locale: candidatura non inviata.**\n\n| Requisito | Stato | Dettaglio |\n|---|---|---|\n${checks.map(c=>`| ${c.name} | ${c.status==='present'?'Presente, da rivedere':'Da completare'} | ${c.detail} |`).join('\n')}\n\nSorgenti inventariati: ${manifest.length}. SHA-256 complessivo: ${fingerprint}.\n\nIl manifest non include credenziali, dati CMC, replay, dipendenze o i documenti originali di handoff. Nessuna chiamata API o pubblicazione eseguita da questo controllo.\n`);
console.log(`${checks.filter(c=>c.status==='present').length}/${checks.length} submission evidence items present; ${manifest.length} source files inventoried. Final review required.`);
