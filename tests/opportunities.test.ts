import test from 'node:test';
import assert from 'node:assert/strict';
import {opportunity,createMatch,addPlayer,validateNodes} from '../packages/sim/dist/index.js';
import {ARENA_SCHEMA_VERSION,type ArenaSnapshot} from '../packages/shared/dist/index.js';
function snapshot():ArenaSnapshot {
 const s=addPlayer(createMatch(7),'p','P');
 return {schemaVersion:ARENA_SCHEMA_VERSION,matchId:'test',selfId:'p',seed:7,tick:100,ackSeq:0,players:s.players,nodes:s.nodes,fragments:s.fragments,gates:s.gates,events:[],remainingTicks:17900,phase:'playing',closeRadius:1000,surge:null,marketVersion:1,marketMode:'SYNTHETIC',marketSourceTime:null,marketMessage:'Synthetic'};
}
test('opportunities reverse the described current without changing market facts',()=>{
 const s=snapshot();s.nodes=[{...s.nodes[0]!,id:1027,symbol:'ETH',momentumN:.7}];
 assert.match(opportunity(s,1),/SYNTHETIC.*LONG current outward/);
 assert.match(opportunity(s,-1),/SHORT current inward/);
 s.nodes=[{...s.nodes[0]!,momentumN:.001}];assert.match(opportunity(s,1),/almost no current/);
});
test('opportunities suppress fresh-market claims for stale data and prioritize safe deposits',()=>{
 const s=snapshot();s.marketMode='STALE';assert.match(opportunity(s,1),/paused/);
 s.players[0]!.cargo=55;assert.match(opportunity(s,1),/Secure 55 cargo/);
 s.phase='closing';assert.match(opportunity(s,1),/MARKET CLOSE/);
});
test('optional volume index validates normalized range and supports old caches',()=>{
 const s=snapshot();assert.doesNotThrow(()=>validateNodes(s.nodes));
 assert.throws(()=>validateNodes([{...s.nodes[0]!,volumeN:NaN}]));
 assert.throws(()=>validateNodes([{...s.nodes[0]!,volumeN:2}]));
 assert.equal(validateNodes([{...s.nodes[0]!,volumeN:.7}])[0]!.volumeN,.7);
});
