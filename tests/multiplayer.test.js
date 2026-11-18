'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
process.env.PORT='0';
process.env.HOST='127.0.0.1';
const {httpServer,evaluateTTT,evaluateConnect,rooms}=require('../server');

function client(url){
  const ws=new WebSocket(url);const history=[];const watchers=[];
  ws.addEventListener('message',ev=>{
    const m=JSON.parse(ev.data);history.push(m);
    for(const watcher of [...watchers]){
      if(watcher.predicate(m)){
        clearTimeout(watcher.timer);
        watchers.splice(watchers.indexOf(watcher),1);
        watcher.resolve(m);
      }
    }
  });
  const ready=new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  return {ws,ready,history,
    send(type,rest={}){ws.send(JSON.stringify({type,...rest}))},
    wait(predicate,timeout=4000){
      const found=history.find(predicate);if(found)return Promise.resolve(found);
      return new Promise((resolve,reject)=>{const watcher={predicate,resolve,timer:null};watcher.timer=setTimeout(()=>{watchers.splice(watchers.indexOf(watcher),1);reject(Error('Timeout waiting for message: '+JSON.stringify(history.at(-1))));},timeout);watchers.push(watcher);});
    }
  };
}

test('Spiellogik wertet TicTacToe und 4 Gewinnt korrekt aus',()=>{
  assert.equal(evaluateTTT(['S','S','S',null,null,null,null,null,null]),'S');
  assert.equal(evaluateTTT(['L',null,null,null,'L',null,null,null,'L']),'L');
  assert.equal(evaluateTTT(['L','S','L','L','S','S','S','L','L']),'draw');
  const board=Array(42).fill(null);for(let c=0;c<4;c++)board[5*7+c]='S';
  assert.equal(evaluateConnect(board),'S');
  const board2=Array(42).fill(null);for(let r=2;r<6;r++)board2[r*7+3]='L';
  assert.equal(evaluateConnect(board2),'L');
});

test('2 echte WebSocket-Spieler erstellen Lobby, treten Teams bei und spielen online TicTacToe',async(t)=>{
  if(typeof WebSocket==='undefined'){t.skip('Node.js >=22 fuer automatischen WebSocket-Test erforderlich');return;}
  if(!httpServer.listening)await new Promise(r=>httpServer.once('listening',r));
  const port=httpServer.address().port;
  const a=client(`ws://127.0.0.1:${port}/ws`);
  const b=client(`ws://127.0.0.1:${port}/ws`);
  t.after(()=>{a.ws.close();b.ws.close();httpServer.closeAllConnections();httpServer.close();});
  await Promise.all([a.ready,b.ready]);
  a.send('create',{name:'Felix'});
  const joinedA=await a.wait(m=>m.type==='joined');
  assert.match(joinedA.code,/^[A-Z0-9]{6}$/);
  b.send('join',{code:joinedA.code,name:'Testfreund'});
  const joinedB=await b.wait(m=>m.type==='joined');
  a.send('team',{team:'L'});
  b.send('team',{team:'S'});
  await a.wait(m=>m.type==='state'&&m.room.players.some(p=>p.id===joinedA.id&&p.team==='L')&&m.room.players.some(p=>p.id===joinedB.id&&p.team==='S'));
  a.send('options',{games:['tictactoe'],rounds:1});
  await a.wait(m=>m.type==='state'&&m.room.options.rounds===1&&m.room.options.games.length===1);
  a.send('start');
  await a.wait(m=>m.type==='state'&&m.room.status==='briefing');
  rooms.get(joinedA.code).briefingEnd=Date.now()+100;
  rooms.get(joinedA.code).previewEnd=Date.now()+250;
  const playing=await a.wait(m=>m.type==='state'&&m.room.status==='playing');
  assert.equal(playing.room.mode,'tictactoe');
  assert.equal(playing.room.game.duels.length,1);
  const duel=playing.room.game.duels[0];
  const first=duel.turn==='L'?a:b,second=duel.turn==='L'?b:a;
  // Erster Spieler gewinnt mit Feldern 0, 3, 6.
  const steps=[[first,0],[second,1],[first,3],[second,2],[first,6]];
  for(let index=0;index<steps.length;index++){
    const [p,cell]=steps[index];p.send('move',{duel:duel.id,row:Math.floor(cell/3),col:cell%3});
    if(index<steps.length-1)await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.game.duels[0].board[cell]!==null);
  }
  const result=await a.wait(m=>m.type==='state'&&m.room.status==='finished');
  assert.equal(result.room.result.winner,duel.turn);
  assert.equal(result.room.scores[duel.turn],100);
  a.send('back');
  const back=await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.round===0&&m.room.players.length===2);
  assert.equal(back.room.players.length,2);
  assert.equal(rooms.has(joinedA.code),true);

  // Vier Gewinnt: erstes Team legt vier Steine in Spalte 0.
  a.send('options',{games:['connect4'],rounds:1});
  await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.options.games[0]==='connect4');
  a.send('start');
  await a.wait(m=>m.type==='state'&&m.room.status==='briefing'&&m.room.mode==='connect4');
  rooms.get(joinedA.code).briefingEnd=Date.now()+100;
  rooms.get(joinedA.code).previewEnd=Date.now()+250;
  const connectStart=await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.mode==='connect4');
  const cd=connectStart.room.game.duels[0];
  const cFirst=cd.turn==='L'?a:b,cSecond=cd.turn==='L'?b:a;
  for(let i=0;i<7;i++){
    const current=i%2===0?cFirst:cSecond;
    current.send('move',{duel:cd.id,col:i%2===0?0:1});
    if(i<6)await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.mode==='connect4'&&m.room.game.duels[0].board.filter(Boolean).length===i+1);
  }
  const connResult=await a.wait(m=>m.type==='state'&&m.room.status==='finished'&&m.room.result.mode==='connect4');
  assert.equal(connResult.room.result.winner,cd.turn);
  a.send('back');
  await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.history.length===0&&m.room.options.games[0]==='connect4');

  // Snake: Echtzeit-Zustand fuer beide Spieler, Futter und Ende.
  a.send('options',{games:['snake'],rounds:1});
  await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.options.games[0]==='snake');
  a.send('start');
  await a.wait(m=>m.type==='state'&&m.room.status==='briefing'&&m.room.mode==='snake');
  rooms.get(joinedA.code).briefingEnd=Date.now()+100;
  rooms.get(joinedA.code).previewEnd=Date.now()+250;
  const snakeStart=await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.mode==='snake');
  assert.equal(snakeStart.room.game.snakes.length,2);
  assert.ok(snakeStart.room.game.food.length>=10);
  rooms.get(joinedA.code).deadline=Date.now()+300;
  await a.wait(m=>m.type==='state'&&m.room.status==='finished'&&m.room.result.mode==='snake');
  a.send('back');
  await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.options.games[0]==='snake');

  // Cell Wars: Echtzeitpositionen / Pellet-Feld / Bewegung und Ende.
  a.send('options',{games:['cellwars'],rounds:1});
  await a.wait(m=>m.type==='state'&&m.room.status==='lobby'&&m.room.options.games[0]==='cellwars');
  a.send('start');
  await a.wait(m=>m.type==='state'&&m.room.status==='briefing'&&m.room.mode==='cellwars');
  rooms.get(joinedA.code).briefingEnd=Date.now()+100;
  rooms.get(joinedA.code).previewEnd=Date.now()+250;
  const cellStart=await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.mode==='cellwars');
  assert.equal(cellStart.room.game.cells.length,2);
  assert.equal(cellStart.room.game.food.length,320);
  const ownX=cellStart.room.game.cells.find(c=>c.id===joinedA.id).x;
  a.send('input',{dx:1,dy:0});
  await a.wait(m=>m.type==='state'&&m.room.status==='playing'&&m.room.mode==='cellwars'&&m.room.game.cells.find(c=>c.id===joinedA.id).x>ownX);
  rooms.get(joinedA.code).deadline=Date.now()+200;
  await a.wait(m=>m.type==='state'&&m.room.status==='finished'&&m.room.result.mode==='cellwars');
  assert.ok(rooms.get(joinedA.code).scores.L>=0);

  const homepage=await fetch('http://127.0.0.1:'+port+'/');
  assert.equal(homepage.status,200);
  assert.match(await homepage.text(),/MIR EGAL/);
});
