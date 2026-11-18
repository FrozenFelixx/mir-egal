'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.PORT='0';process.env.HOST='127.0.0.1';
const {httpServer,rooms}=require('../server');
function connect(url){
 const ws=new WebSocket(url),messages=[];
 ws.addEventListener('message',event=>messages.push(JSON.parse(event.data)));
 return {ws,messages,opened:new Promise(r=>ws.addEventListener('open',r,{once:true})),send(type,props={}){ws.send(JSON.stringify({type,...props}));},
  async wait(predicate,timeout=4000){
   const deadline=Date.now()+timeout;
   while(Date.now()<deadline){const found=messages.find(predicate);if(found)return found;await new Promise(r=>setTimeout(r,20));}
   throw Error('Message timeout (latest: '+JSON.stringify(messages.at(-1))+')');
  }
 };
}
test('Mathquiz: keine Zeitwechsel; jeder Fehler -5; nur korrekte Antwort löst neue Aufgabe aus',async t=>{
 if(typeof WebSocket==='undefined'){t.skip('WebSocket nicht verfügbar');return;}
 if(!httpServer.listening)await new Promise(r=>httpServer.once('listening',r));
 const url=`ws://127.0.0.1:${httpServer.address().port}/ws`;
 const a=connect(url),b=connect(url);t.after(()=>{a.ws.close();b.ws.close();httpServer.closeAllConnections();httpServer.close();});
 await Promise.all([a.opened,b.opened]);
 a.send('create',{name:'Bunny',pet:'bunny',color:'mint',accessory:'bow'});
 const joined=await a.wait(m=>m.type==='joined');
 b.send('join',{code:joined.code,name:'Cat',pet:'cat',color:'rose',accessory:'glasses'});
 await b.wait(m=>m.type==='joined');
 a.send('team',{team:'L'});b.send('team',{team:'S'});
 await a.wait(m=>m.type==='state'&&m.room.players.filter(x=>x.team).length===2);
 a.send('options',{games:['mathquiz'],rounds:1});
 await a.wait(m=>m.type==='state'&&m.room.options.games.length===1&&m.room.options.games[0]==='mathquiz');
 a.send('start');
 await a.wait(m=>m.type==='state'&&m.room.status==='briefing');
 const actual=rooms.get(joined.code);actual.briefingEnd=Date.now()+50;actual.previewEnd=Date.now()+120;
 const live=await a.wait(m=>m.type==='state'&&m.room.status==='playing');
 const player=live.room.players.find(p=>p.id===joined.id);
 assert.equal(player.color,'mint');assert.equal(player.accessory,'bow');
 const duel=live.room.game.duels[0],q0=duel.questionId,answer=duel.question.answer;
 // The old version changed the question after 8 seconds; artificially age it.
 actual.game.duels[0].questionAt=Date.now()-60000;
 await new Promise(r=>setTimeout(r,350));
 assert.equal(actual.game.duels[0].questionId,q0,'Aufgabe darf nicht zeitabhängig wechseln');
 a.send('mathanswer',{duel:duel.id,questionId:q0,answer:answer+7});
 await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.game?.duels?.[0].scores.L===-5);
 assert.equal(actual.game.duels[0].questionId,q0,'Aufgabe bleibt nach Fehler gleich');
 await new Promise(r=>setTimeout(r,260));
 a.send('mathanswer',{duel:duel.id,questionId:q0,answer:answer+8});
 await a.wait(m=>m.type==='state'&&m.room.game?.duels?.[0].scores.L===-10);
 assert.equal(actual.game.duels[0].questionId,q0);
 await new Promise(r=>setTimeout(r,260));
 a.send('mathanswer',{duel:duel.id,questionId:q0,answer});
 await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.game?.duels?.[0].questionId===q0+1);
 assert.equal(actual.game.duels[0].scores.L,0,'10 Punkte minus zweimal 5 = 0');
 assert.equal(actual.game.duels[0].lastFeedback.correct,true);
 await new Promise(r=>setTimeout(r,350));
 a.send('mathanswer',{duel:duel.id,questionId:q0,answer});
 await new Promise(r=>setTimeout(r,220));
 assert.equal(actual.game.duels[0].questionId,q0+1,'veraltete Antworten dürfen Aufgabe nicht ändern');
 actual.deadline=Date.now()+60;
 const end=await a.wait(m=>m.type==='state'&&m.room.status==='finished');
 assert.equal(end.room.scores.L,0,'Matchpunkte dürfen nicht erneut x10 multipliziert werden');
});
