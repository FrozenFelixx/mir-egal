'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const rooms = new Map();
const peers = new Set();
const MAX_ROOMS = 200;
const GAMES = ['tictactoe', 'connect4', 'snake', 'cellwars', 'mathquiz', 'wordle'];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random()*(b-a);
const rid = () => crypto.randomBytes(8).toString('hex');
const PETS=['bunny','cat','hedgehog','fox','bat','star'];
const COLORS=['rose','blue','mint','gold','lavender','peach'];
const ACCESSORIES=['none','bow','crown','glasses','scarf'];
const safeColor=v=>COLORS.includes(v)?v:'lavender';
const safeAccessory=v=>ACCESSORIES.includes(v)?v:'none';
const safePet=v=>PETS.includes(v)?v:'bunny';
const safeName = (v) => String(v ?? '').replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0,18) || 'Spieler';
const timestamp = () => Date.now();
const BOT_NAMES=['Sternhase','Mondkatze','Igelstern','Nebelpfote','Kometenbunny','Wolkenigel','Lunafuchs','Sternschnuppe','Nachtmiez','Glitzerpfote'];
const isBot=p=>!!p.bot;
const botCount=room=>room.players.filter(isBot).length;
function addBot(room,team){
  if(room.status!=='lobby'||room.players.length>=20||playersOf(room,team).length>=10)return false;
  const n=botCount(room),name=BOT_NAMES[n%BOT_NAMES.length]+' '+(n+1);
  room.players.push({id:'bot-'+rid(),name,team,ready:true,bot:true,pet:PETS[n%PETS.length],color:COLORS[n%COLORS.length],accessory:ACCESSORIES[n%ACCESSORIES.length],peer:{send(){}}});
  broadcast(room);return true;
}
function removeBot(room,id){
  if(room.status!=='lobby')return;
  const p=room.players.find(p=>p.id===id&&p.bot);
  if(!p)return;
  room.players=room.players.filter(x=>x!==p);
  broadcast(room);
}
const teamPlayer = (room, id) => room.players.find(p => p.id === id && p.team);

const httpServer = http.createServer((req,res) => {


  if(req.url==='/health'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({
      status:'online',
      uptime:Math.floor(process.uptime()),
      rooms:rooms.size,
      timestamp:Date.now()
    }));
    return;
  }


  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
  const allowed = {
  '/':'index.html',
  '/index.html':'index.html',
  '/style.css':'style.css',
  '/app.js':'app.js',
  '/audio.js':'audio.js',
  '/avatars.js':'avatars.js',
  '/favicon.svg':'favicon.svg',
  '/Mir_egal_Logo.png':'Mir_egal_Logo.png',
  '/Team_L_Logo.png':'Team_L_Logo.png',
  '/Team_S_Logo.png':'Team_S_Logo.png'
};
  const file = allowed[url.pathname];
  if (!file) { res.writeHead(404).end('Nicht gefunden'); return; }
  fs.readFile(path.join(PUBLIC,file), (err, content) => {
    if(err) {res.writeHead(404).end();return;}
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff'});
    if (req.method === 'HEAD') res.end(); else res.end(content);
  });
});

// Kleiner WebSocket-Server ohne npm-Abhaengigkeiten: Browser-WebSocket RFC 6455.
class Peer {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.player = null;
    this.closed = false;
    this.messages = 0;
    this.rateReset = Date.now()+1000;
    peers.add(this);
    socket.on('data', data => this.read(data));
    socket.on('close', () => this.close());
    socket.on('error', () => this.close());
  }
  send(obj) {
    if(this.closed || this.socket.destroyed) return;
    const payload = Buffer.from(JSON.stringify(obj));
    let head;
    if(payload.length < 126) { head = Buffer.from([0x81,payload.length]); }
    else if(payload.length < 65536) { head = Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(payload.length,2); }
    else { head=Buffer.alloc(10);head[0]=0x81;head[1]=127;head.writeBigUInt64BE(BigInt(payload.length),2); }
    try { this.socket.write(Buffer.concat([head,payload])); } catch { this.close(); }
  }
  pong(payload) {try {this.socket.write(Buffer.concat([Buffer.from([0x8a,payload.length]),payload]));}catch {this.close();}}
  read(data) {
    if(this.closed) return;
    this.buffer=Buffer.concat([this.buffer,data]);
    if(this.buffer.length > 65536) {this.socket.destroy();return;}
    while(this.buffer.length >= 2) {
      const first=this.buffer[0], second=this.buffer[1], op=first&15;
      if(!(first&0x80) || !(second&0x80)) {this.socket.destroy();return;}
      let len=second&127, off=2;
      if(len===126) {if(this.buffer.length<4)return;len=this.buffer.readUInt16BE(2);off=4;}
      if(len===127) {if(this.buffer.length<10)return; const n=this.buffer.readBigUInt64BE(2);if(n>BigInt(32768)){this.socket.destroy();return;}len=Number(n);off=10;}
      if(len>32768){this.socket.destroy();return;}
      if(this.buffer.length < off+4+len) return;
      const mask=this.buffer.subarray(off,off+4);off+=4;
      const body=Buffer.from(this.buffer.subarray(off,off+len));
      for(let i=0;i<body.length;i++)body[i]^=mask[i%4];
      this.buffer=this.buffer.subarray(off+len);
      if(op===0x8){this.socket.end();this.close();return;}
      if(op===0x9){this.pong(body);continue;}
      if(op!==0x1)continue;
      const now=Date.now();
      if(now>this.rateReset){this.messages=0;this.rateReset=now+1000;}
      if(++this.messages>40)continue;
      let msg;try{msg=JSON.parse(body.toString('utf8'));}catch{continue;}
      try{onMessage(this,msg);}catch(e){console.error('Nachrichtenfehler:',e);this.send({type:'error', message:'Die Aktion konnte nicht ausgefuehrt werden.'});}
    }
  }
  close() {
    if(this.closed)return;
    this.closed=true;peers.delete(this);
    leave(this);
  }
}
httpServer.on('upgrade',(req,socket,head) => {
  const origin=req.headers.origin;
  if(req.url!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof req.headers['sec-websocket-key']!=='string') {socket.destroy();return;}
  if(origin) {try{const parsed=new URL(origin);if(parsed.host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}}
  const accept=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const peer=new Peer(socket);
  if(head.length)peer.read(head);
});

function error(peer,message){peer.send({type:'error',message});}
function makeCode(){for(let attempt=0;attempt<1000;attempt++){let code='';for(let n=0;n<6;n++)code+=CODE_ALPHABET[Math.floor(Math.random()*CODE_ALPHABET.length)];if(!rooms.has(code))return code;}throw Error('Codes erschoepft');}
function joinRoom(peer,room,name,pet) {
  if(peer.player) {error(peer,'Du bist bereits in einer Lobby.');return;}
  if(room.players.length>=20){error(peer,'Die Lobby ist voll.');return;}
  const player={id:rid(),name:safeName(name),pet:safePet(pet),color:safeColor(peer.color),accessory:safeAccessory(peer.accessory),team:null,ready:false,peer};
  room.players.push(player);peer.player={room,player};
  if(!room.hostId)room.hostId=player.id;
  peer.send({type:'joined',id:player.id,code:room.code});
  broadcast(room);
}
function leave(peer) {
  if(!peer.player)return;
  const {room,player}=peer.player;peer.player=null;
  room.players=room.players.filter(p=>p.id!==player.id);
  if(!room.players.some(p=>!p.bot)){rooms.delete(room.code);return;}
  if(room.hostId===player.id)room.hostId=room.players.find(p=>!p.bot)?.id||null;
  if(room.status==='playing') {
    if(room.mode==='tictactoe'||room.mode==='connect4'){
      for(const duel of room.game.duels){
        if(!duel.finished&&(duel.l===player.id||duel.s===player.id)){
          duel.finished=true;duel.winner=duel.l===player.id?'S':'L';duel.endReason='Gegner hat die Lobby verlassen';
        }
      }
      if(room.game.duels.every(d=>d.finished))finishGame(room);
    }else if(room.mode==='wordle'){
      for(const d of room.game.duels){if(!d.finished&&(d.l===player.id||d.s===player.id)){d.finished=true;d.winner=d.l===player.id?'S':'L';d.finishedAt=Date.now();}}
      if(room.game.duels.every(d=>d.finished))finishGame(room);
    }else if(room.mode==='snake'){
      const snake=room.game.snakes.find(s=>s.id===player.id);if(snake)snake.alive=false;
    }else if(room.mode==='cellwars'){
      room.game.cells=room.game.cells.filter(s=>s.id!==player.id);
    }
    if(!room.players.some(p=>p.team==='L')||!room.players.some(p=>p.team==='S'))finishGame(room);
    else if(room.status==='playing'&&(room.mode==='snake'||room.mode==='cellwars'))checkElimination(room,Date.now());
  }
  broadcast(room);
}
function current(peer) {return peer.player?.room || null;}
function host(peer) {const r=current(peer);return !!r&&peer.player.player.id===r.hostId;}
function playersOf(room,team){return room.players.filter(p=>p.team===team);}
function publicRoom(room){
  return {code:room.code,hostId:room.hostId,status:room.status,players:room.players.map(p=>({id:p.id,name:p.name,team:p.team,ready:p.ready,bot:!!p.bot,pet:p.pet||'bunny',color:p.color||'lavender',accessory:p.accessory||'none'})),
    options:room.options,scores:room.scores,round:room.round,rounds:room.options.rounds,mode:room.mode,
    deadline:room.deadline,resultsEnd:room.resultsEnd,briefingStart:room.briefingStart,briefingEnd:room.briefingEnd,previewEnd:room.previewEnd,history:room.history.slice(-9),result:room.result,
    game:['playing','preview'].includes(room.status)?gamePublic(room):null, serverNow:Date.now()};
}
function gamePublic(room){
  const g=room.game;
  if(!g)return null;
  if(room.mode==='tictactoe'||room.mode==='connect4')return {duels:g.duels};
  if(room.mode==='mathquiz')return {duels:g.duels};

if(room.mode==='wordle'){
 return {
  duels:g.duels.map(d=>({
   id:d.id,
   l:d.l,
   s:d.s,
   guesses:d.guesses,
   finished:d.finished,
   winner:d.winner,
   revision:d.revision
  }))
 };
}

  if(room.mode==='snake')return {width:g.width,height:g.height,snakes:g.snakes,food:g.food};
  if(room.mode==='cellwars')return {width:g.width,height:g.height,cells:g.cells,food:g.food,powerups:g.powerups,viruses:g.viruses};
  return null;
}
function broadcast(room){if(!rooms.has(room.code))return;const msg={type:'state',room:publicRoom(room)};for(const p of room.players)if(!p.bot)p.peer.send(msg);}
function resetRoom(room){
  room.status='lobby';room.round=0;room.mode=null;room.deadline=null;room.game=null;room.result=null;room.history=[];room.scores={L:0,S:0};room.sequence=[];
  for(const p of room.players)p.ready=false;
}
function genSequence(games,n){
  const output=[];
  for(let i=0;i<n;i++){
    const pool=games.filter(g=>g!==output.at(-1));
    output.push((pool.length?pool:games)[Math.floor(Math.random()*(pool.length||games.length))]);
  }
  return output;
}
function startSeries(room){
  room.status='briefing';room.round=0;room.scores={L:0,S:0};room.history=[];room.result=null;
  room.sequence=genSequence(room.options.games,room.options.rounds);
  startRound(room);
}
function startRound(room){
  room.round+=1;room.mode=room.sequence[room.round-1];room.status='briefing';room.result=null;room.resultsEnd=null;
  room.briefingStart=Date.now();room.briefingEnd=room.briefingStart+10000;room.previewEnd=room.briefingEnd+3000;
  room.deadline=null;
  if(room.mode==='tictactoe'||room.mode==='connect4')initDuelGame(room);
  else if(room.mode==='snake')initSnake(room);
  else if(room.mode==='cellwars')initCell(room);
  else if(room.mode==='mathquiz')initMath(room);
  else if(room.mode==='wordle')initWordle(room);
  broadcast(room);
}

function activateRound(room){
 if(room.status!=='preview')return;

 const now=Date.now();

 room.status='playing';
 room.deadline=now+({
  tictactoe:90000,
  connect4:120000,
  snake:75000,
  cellwars:75000,
  mathquiz:65000,
  wordle:90000
 }[room.mode]||90000);

 if(room.mode==='snake')room.game.lastMove=now;
 if(room.mode==='cellwars')room.game.lastTick=now;

 if(room.game?.duels){
  for(const d of room.game.duels){
   d.turnSince=now;

   if(room.mode==='wordle'){
    d.lastGuessAt={L:now,S:now};
    d.nextBotGuessAt={
     L:now+4000+Math.random()*2000,
     S:now+4000+Math.random()*2000
    };
   }
  }
 }

 broadcast(room);
}

function ensureBalancedTeams(room){
 const L=playersOf(room,'L'),S=playersOf(room,'S');
 if(!L.length||!S.length)return 'Beide Teams brauchen mindestens einen Spieler.';
 if(Math.abs(L.length-S.length)>1)return 'Die Teams dürfen sich höchstens um einen Spieler unterscheiden.';
 return null;
}
function makePairs(room){
 const rotate=(arr,n)=>arr.length?[...arr.slice(n%arr.length),...arr.slice(0,n%arr.length)]:[];
 const L=rotate(playersOf(room,'L'),room.round-1),S=rotate(playersOf(room,'S'),room.round-1);
 const count=Math.max(L.length,S.length),pairs=[];
 for(let i=0;i<count;i++){
   let l=L[i],r=S[i];
   if(!l)l={id:'roundbot-L-'+room.round+'-'+i,name:'Sternenbot L',team:'L',pet:'cat',bot:true};
   if(!r)r={id:'roundbot-S-'+room.round+'-'+i,name:'Sternenbot S',team:'S',pet:'bunny',bot:true};
   pairs.push({id:i+1,l:l.id,s:r.id});
 }
 return pairs;
}
function isRoundBot(room,id){return typeof id==='string'&&id.startsWith('roundbot-');}
function initDuelGame(room){
 room.game={duels:makePairs(room).map(pair=>({...pair,board:Array(room.mode==='connect4'?42:9).fill(null),turn:(room.round+pair.id)%2===0?'L':'S',finished:false,winner:null,turnSince:Date.now(),endReason:null}))};
}
function newMathQuestion(){
  const a=Math.floor(rand(3,30)),b=Math.floor(rand(2,19)),op=['+','−','×'][Math.floor(rand(0,3))];
  return {text:`${a} ${op} ${b}`,answer:op==='+'?a+b:op==='−'?a-b:a*b};
}



const WORDLE_FALLBACK=[
 'APFEL','BLUME','BRAUN','BRIEF','DECKE','ENGEL',
 'ESSEN','FADEN','FARBE','FEDER','FEUER','FISCH',
 'FLUSS','FROST','FUCHS','GABEL','GEIST','GLANZ',
 'GRIFF','GURKE','HAFEN','HALLE','HALLO','HANDY',
 'HERDE','HILFE','HONIG','INSEL','JACKE','KABEL',
 'KAKAO','KANTE','KARTE','KASSE','KATZE','KERZE',
 'KETTE','KISTE','KLANG','KLEID','KLEIN','KLIMA',
 'KNALL','KOALA','KOHLE','KOMET','KOPIE','KRAFT',
 'KRANK','KREIS','KRONE','KUGEL','KUNST','KURVE',
 'LADEN','LAMPE','LAUNE','LEBEN','LEDER','LEISE',
 'LICHT','LIEBE','LINIE','LOCKE','LOGIK','LUNGE',
 'MACHT','MAGIE','MANGO','MARKE','MASKE','MAUER',
 'MEILE','MILCH','MINZE','MITTE','MONAT','MORAL',
 'MOTOR','MUTIG','NACHT','NADEL','NARBE','NEBEL',
 'NOTEN','OASEN','OCHSE','OFFEN','OHREN','ONKEL',
 'ORDEN','ORGAN','OSTEN','PAKET','PALME','PANIK',
 'PAPPE','PARTY','PAUSE','PERLE','PFERD','PILOT',
 'PIZZA','PLATZ','POKAL','PREIS','PUNKT','PUPPE',
 'QUARK','RADAR','RADIO','RAMPE','RASEN','RAUCH',
 'RAUPE','REGEN','REICH','REIFE','REISE','RENTE',
 'RIESE','RINDE','RINGE','ROBOT','ROSEN','ROTOR',
 'RUDER','RUHIG','RUNDE','SACHE','SALAT','SALBE',
 'SALON','SAMEN','SANFT','SAUER','SCHAF','SCHUH',
 'SEELE','SEGEL','SEIFE','SEITE','SILBE','SKALA',
 'SONNE','SORGE','SPALT','SPASS','SPECK','SPIEL',
 'SPION','SPORT','SPULE','STADT','STAHL','STAND',
 'STARK','STAUB','STEIN','STERN','STIEL','STIFT',
 'STILL','STOFF','STOLZ','STROM','STUFE','STUHL',
 'STURM','SUCHE','SUPER','SUPPE','SUSHI','TANNE',
 'TASSE','TAUBE','TAUFE','TEICH','TEILE','TEMPO',
 'THEMA','TIGER','TINTE','TISCH','TITEL','TOAST',
 'TONNE','TORTE','TOTAL','TRAUM','TREUE','TRICK',
 'TRIEB','TROST','TRUHE','TULPE','TURBO','UMWEG',
 'UNFUG','UNTER','VATER','VIDEO','VIRUS','VOGEL',
 'VORNE','WAAGE','WACHE','WAGEN','WALZE','WANNE',
 'WATTE','WEIDE','WEISE','WELLE','WENIG','WERTE',
 'WESEN','WIESE','WILLE','WITZE','WOCHE','WOLKE',
 'WORTE','WUNDE','WURST','ZANGE','ZEILE','ZEUGE',
 'ZIEGE','ZIELE','ZITAT','ZONEN','ZUNGE','ZWECK'
];

function normalizeWordleWord(word){
 return String(word||'')
  .trim()
  .toUpperCase()
  .replace(/Ä/g,'AE')
  .replace(/Ö/g,'OE')
  .replace(/Ü/g,'UE')
  .replace(/ẞ/g,'SS')
  .replace(/ß/g,'SS');
}

function loadWordleWords(){
 const filename=path.join(PUBLIC,'wordle-words.txt');

 if(!fs.existsSync(filename)){
  console.warn('Wordle: Externe Wortliste fehlt. Fallback wird verwendet.');
  return [...new Set(WORDLE_FALLBACK)];
 }

 const words=fs.readFileSync(filename,'utf8')
  .split(/\r?\n/)
  .map(normalizeWordleWord)
  .filter(word=>/^[A-Z]{5}$/.test(word));

 return [...new Set([...WORDLE_FALLBACK,...words])];
}

const WORDLE_WORDS=loadWordleWords();
const WORDLE_ALLOWED=new Set(WORDLE_WORDS);

console.log(`Wordle: ${WORDLE_WORDS.length} Wörter geladen.`);


const WORDLE_MAX_GUESSES=6;

function wordlePick(){
 return WORDLE_WORDS[Math.floor(Math.random()*WORDLE_WORDS.length)];
}

function wordleEvaluate(guess,answer){
 const result=Array(5).fill('absent');
 const remaining={};

 for(let i=0;i<5;i++){
  if(guess[i]===answer[i]){
   result[i]='correct';
  }else{
   remaining[answer[i]]=(remaining[answer[i]]||0)+1;
  }
 }

 for(let i=0;i<5;i++){
  if(result[i]==='correct')continue;
  if(remaining[guess[i]]>0){
   result[i]='present';
   remaining[guess[i]]--;
  }
 }

 return result;
}

function initWordle(room){
 const word=wordlePick();

 room.game={
  duels:makePairs(room).map(pair=>({
   ...pair,
   answer:word,
   guesses:{L:[],S:[]},
   finished:false,
   winner:null,
   finishedAt:null,
   lastGuessAt:{L:0,S:0},
   revision:0
  }))
 };
}

function guessWordle(room,player,msg){
 if(room.status!=='playing'||room.mode!=='wordle')return;

 const duel=room.game.duels.find(d=>d.id===Number(msg.duel));
 if(!duel||duel.finished)return;

 const team=player.team;
 if(!['L','S'].includes(team))return;
 if((team==='L'?duel.l:duel.s)!==player.id)return;

const word=normalizeWordleWord(msg.word);
 if(!/^[A-Z]{5}$/.test(word))return;
 if(!WORDLE_ALLOWED.has(word)){
  if(!player.bot)player.peer.send({type:'error',message:'Dieses Wort ist nicht in der Wortliste.'});
  return;
 }

 const now=Date.now();
 if(now-duel.lastGuessAt[team]<300)return;
 if(duel.guesses[team].length>=WORDLE_MAX_GUESSES)return;

 duel.lastGuessAt[team]=now;

 const marks=wordleEvaluate(word,duel.answer);
 duel.guesses[team].push({word,marks});
 duel.revision++;

 if(word===duel.answer){
  duel.finished=true;
  duel.winner=team;
  duel.finishedAt=now;
 }else if(duel.guesses.L.length>=WORDLE_MAX_GUESSES&&duel.guesses.S.length>=WORDLE_MAX_GUESSES){
  duel.finished=true;
  duel.winner='draw';
  duel.finishedAt=now;
 }


const allFinished=room.game.duels.length>0
 &&room.game.duels.every(d=>d.finished);

if(allFinished){
 finishGame(room);
}else{
 broadcast(room);
}

}


function initMath(room){
 room.game={duels:makePairs(room).map(pair=>({...pair,question:newMathQuestion(),scores:{L:0,S:0},round:1,nextAt:Date.now(),questionId:1,attemptAt:{},lastFeedback:null,feedbackSeq:0}))};
}
function answerMath(room,player,msg){
  if(room.status!=='playing'||room.mode!=='mathquiz')return;
  const d=room.game.duels.find(d=>d.id===Number(msg.duel));
  if(!d||!((player.team==='L'&&d.l===player.id)||(player.team==='S'&&d.s===player.id)))return;
  const now=Date.now();
  if(now<d.nextAt||Number(msg.questionId)!==d.questionId)return;
  const answer=Number(msg.answer);
  if(msg.answer===null||msg.answer===''||!Number.isFinite(answer)||!Number.isSafeInteger(answer))return;
  if(now-(d.attemptAt[player.id]||0)<220)return;
  d.attemptAt[player.id]=now;
  const correct=answer===d.question.answer;
  const delta=correct?10:-5;
  d.scores[player.team]+=delta;
  const solvedId=d.questionId;
  d.lastFeedback={seq:++d.feedbackSeq,playerId:player.id,team:player.team,delta,correct,questionId:solvedId};
  if(correct){
    d.question=newMathQuestion();
    d.round++;
    d.questionId++;
    d.nextAt=now+320;
  }
  broadcast(room);
}
function evaluateTTT(b){
  for(const [a,c,d] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(b[a]&&b[a]===b[c]&&b[c]===b[d])return b[a];
  return b.every(Boolean)?'draw':null;
}
function evaluateConnect(b){
  for(let r=0;r<6;r++)for(let c=0;c<7;c++){
    const t=b[r*7+c];if(!t)continue;
    for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
      let ok=true;for(let k=1;k<4;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=6||cc<0||cc>=7||b[rr*7+cc]!==t){ok=false;break;}}
      if(ok)return t;
    }
  }
  return b.every(Boolean)?'draw':null;
}
function playDuel(room,player,msg){
  const game=room.game;
  const duel=game.duels.find(d=>d.id===Number(msg.duel));
  if(!duel||duel.finished||duel.turn!==player.team||(player.team==='L'?duel.l:duel.s)!==player.id)return;
  const col=Number(msg.col),row=Number(msg.row);
  if(!Number.isInteger(col))return;
  let index=-1;
  if(room.mode==='tictactoe'){
    if(!Number.isInteger(row)||row<0||row>2||col<0||col>2)return;
    index=row*3+col;
    if(duel.board[index])return;
  }else{
    if(col<0||col>6)return;
    for(let r=5;r>=0;r--)if(!duel.board[r*7+col]){index=r*7+col;break;}
    if(index<0)return;
  }
  duel.board[index]=player.team;
  const outcome=room.mode==='tictactoe'?evaluateTTT(duel.board):evaluateConnect(duel.board);
  if(outcome){duel.finished=true;duel.winner=outcome;duel.endReason=outcome==='draw'?'Unentschieden':'Vier / drei in einer Reihe';}
  else {duel.turn=player.team==='L'?'S':'L';duel.turnSince=Date.now();}
  if(room.game.duels.every(d=>d.finished))finishGame(room);else broadcast(room);
}
function chooseOpenCell(occupied,width,height){
  for(let tries=0;tries<1000;tries++){const x=Math.floor(rand(2,width-2)), y=Math.floor(rand(2,height-2));if(!occupied.has(`${x},${y}`))return [x,y];}
  return [Math.floor(width/2),Math.floor(height/2)];
}

function initSnake(room){
 const g={width:1200,height:760,snakes:[],food:[],lastMove:Date.now(),startedAt:Date.now()};
 const list=room.players.filter(p=>p.team);
 const margin=125;
 const bodyLength=18;
 const bodySpacing=5;
 const directions=32;
 const desiredDistance=220;

 for(const p of list){
  let best=null;

  for(let attempt=0;attempt<500;attempt++){
   const x=rand(margin,g.width-margin);
   const y=rand(margin,g.height-margin);

   const nearest=g.snakes.length?Math.min(...g.snakes.map(s=>Math.hypot(s.x-x,s.y-y))):Infinity;
   const wallDistance=Math.min(x,g.width-x,y,g.height-y);

   let bestAngle=0;
   let bestSafety=-Infinity;

   for(let i=0;i<directions;i++){
    const angle=i*Math.PI*2/directions;
    const dx=Math.cos(angle),dy=Math.sin(angle);

    const frontX=x+dx*140,frontY=y+dy*140;
    const tailX=x-dx*(bodyLength-1)*bodySpacing;
    const tailY=y-dy*(bodyLength-1)*bodySpacing;

    if(frontX<35||frontX>g.width-35||frontY<35||frontY>g.height-35)continue;
    if(tailX<35||tailX>g.width-35||tailY<35||tailY>g.height-35)continue;

    let safety=Math.min(frontX,g.width-frontX,frontY,g.height-frontY)*0.7;

    for(const other of g.snakes){
     const headDistance=Math.hypot(frontX-other.x,frontY-other.y);
     const tailDistance=Math.hypot(tailX-other.x,tailY-other.y);
     safety+=Math.min(headDistance,450)*0.8;
     safety+=Math.min(tailDistance,300)*0.4;

     if(headDistance<170)safety-=500;
     if(tailDistance<130)safety-=500;

     for(const part of other.body){
      if(Math.hypot(frontX-part[0],frontY-part[1])<110)safety-=350;
      if(Math.hypot(tailX-part[0],tailY-part[1])<80)safety-=350;
     }
    }

    safety+=Math.random()*15;

    if(safety>bestSafety){
     bestSafety=safety;
     bestAngle=angle;
    }
   }

   const spacingScore=Math.min(nearest,desiredDistance)*8;
   const penalty=nearest<desiredDistance?(desiredDistance-nearest)*15:0;
   const score=spacingScore+bestSafety+wallDistance*0.2-penalty;

   if(!best||score>best.score){
    best={x,y,angle:bestAngle,score,nearest};
   }

   if(nearest>=desiredDistance&&bestSafety>100&&attempt>=35)break;
  }

  const {x,y,angle}=best;
  const body=Array.from({length:bodyLength},(_,j)=>[
   x-Math.cos(angle)*j*bodySpacing,
   y-Math.sin(angle)*j*bodySpacing
  ]);

  g.snakes.push({
   id:p.id,
   team:p.team,
   x,y,
   angle,
   targetAngle:angle,
   body,
   alive:true,
   score:0,
   boost:0
  });
 }

 for(let i=0;i<160;i++){
  g.food.push([rand(18,g.width-18),rand(18,g.height-18)]);
 }

 room.game=g;
}

function tickSnake(room,now){
 const g=room.game,dt=clamp((now-g.lastMove)/1000,0,.065);g.lastMove=now;
 for(const sn of g.snakes){
  if(!sn.alive)continue;
  const delta=Math.atan2(Math.sin(sn.targetAngle-sn.angle),Math.cos(sn.targetAngle-sn.angle));
  sn.angle+=clamp(delta,-3.8*dt,3.8*dt);
  const speed=sn.boost>now?210:145;
  sn.x+=Math.cos(sn.angle)*speed*dt;sn.y+=Math.sin(sn.angle)*speed*dt;
  if(sn.x<10||sn.x>g.width-10||sn.y<10||sn.y>g.height-10){sn.alive=false;continue;}
  const head=[sn.x,sn.y];
  if(!sn.body.length||Math.hypot(sn.body[0][0]-sn.x,sn.body[0][1]-sn.y)>5)sn.body.unshift(head);
  const max=18+Math.min(55,Math.floor(sn.score/18));
  // Fixed-length spatial sampling keeps packets small and movement smooth.
  while(sn.body.length>max)sn.body.pop();
  for(let i=g.food.length-1;i>=0;i--){
   const f=g.food[i];
   if(Math.hypot(sn.x-f[0],sn.y-f[1])<13){
    sn.score+=3;g.food[i]=[rand(18,1182),rand(18,742)];
   }
  }
  for(const other of g.snakes){
   if(!other.alive)continue;
   for(let j=other===sn?12:4;j<other.body.length;j+=2){
    const part=other.body[j];
    if(Math.hypot(sn.x-part[0],sn.y-part[1])<10){sn.alive=false;break;}
   }
   if(!sn.alive)break;
  }
  if(!sn.alive){for(let j=0;j<sn.body.length;j+=3){const p=sn.body[j];g.food.push([p[0],p[1]]);}if(g.food.length>400)g.food.splice(0,g.food.length-400);}
 }
 if(now>=room.deadline)finishGame(room);
}
function initCell(room){
  const g={width:1600,height:1000,cells:[],food:[],powerups:[],viruses:Array.from({length:14},()=>({x:rand(80,1520),y:rand(80,920),r:28})),lastPowerup:0,lastTick:Date.now(),startedAt:Date.now()};
  for(const player of room.players.filter(p=>p.team)){
    let x,y;for(let n=0;n<300;n++){x=rand(80,1520);y=rand(80,920);if(g.cells.every(c=>Math.hypot(c.x-x,c.y-y)>75))break;}
    g.cells.push({id:player.id,team:player.team,x,y,r:15,mass:0,score:0,kills:0,dx:0,dy:0,deadUntil:0,boostUntil:0,shieldUntil:0,splitUntil:0});
  }
  for(let i=0;i<320;i++)g.food.push({x:rand(10,1590),y:rand(10,990)});
  room.game=g;
}
function tickCell(room,now){
  const g=room.game;const dt=clamp((now-g.lastTick)/1000,0,0.1);g.lastTick=now;
  for(const c of g.cells){
    if(c.deadUntil>now)continue;
    // Eliminated cells remain eliminated for the rest of the round.
    const speed=clamp(210-c.r*1.8,80,190)*(c.boostUntil>now?1.7:1);
    c.x=clamp(c.x+c.dx*speed*dt,c.r,g.width-c.r);
    c.y=clamp(c.y+c.dy*speed*dt,c.r,g.height-c.r);
    for(let i=g.powerups.length-1;i>=0;i--){
      const pu=g.powerups[i];
      if(Math.hypot(c.x-pu.x,c.y-pu.y)<c.r+12){
        if(pu.type==='boost')c.boostUntil=now+6500;
        else if(pu.type==='shield')c.shieldUntil=now+6500;
        else {c.mass+=12;c.score+=25;c.r=clamp(15+Math.sqrt(c.mass)*1.8,15,46);}
        g.powerups.splice(i,1);
      }
    }
    for(const virus of g.viruses){if(c.r>29&&Math.hypot(c.x-virus.x,c.y-virus.y)<c.r+virus.r*.5){c.mass=Math.max(0,c.mass*.6);c.r=clamp(15+Math.sqrt(c.mass)*1.8,15,46);c.x=clamp(c.x+rand(-100,100),c.r,g.width-c.r);c.y=clamp(c.y+rand(-100,100),c.r,g.height-c.r);virus.x=rand(80,1520);virus.y=rand(80,920);}}
    for(let i=g.food.length-1;i>=0;i--){const f=g.food[i];if(Math.hypot(c.x-f.x,c.y-f.y)<c.r+3){g.food.splice(i,1);c.mass+=1;c.score+=2;c.r=clamp(15+Math.sqrt(c.mass)*1.8,15,46);}}
  }
  for(let i=0;i<g.cells.length;i++)for(let j=i+1;j<g.cells.length;j++){
    const a=g.cells[i],b=g.cells[j];if(a.team===b.team||a.deadUntil>now||b.deadUntil>now)continue;
    let big,small;if(a.r>=b.r*1.16){big=a;small=b;}else if(b.r>=a.r*1.16){big=b;small=a;}else continue;
    if(small.shieldUntil>now)continue;
    if(Math.hypot(big.x-small.x,big.y-small.y)<big.r-small.r*0.24+small.r*0.7){
      big.mass+=Math.max(8,Math.floor(small.mass*.65));big.score+=35;big.kills++;
      big.r=clamp(15+Math.sqrt(big.mass)*1.8,15,46);
      small.mass=0;small.r=15;small.deadUntil=8640000000000000;small.dx=0;small.dy=0;
    }
  }
  if(now-g.lastPowerup>5000&&g.powerups.length<5){
    g.lastPowerup=now;
    g.powerups.push({x:rand(35,1565),y:rand(35,965),type:['boost','shield','bonus'][Math.floor(rand(0,3))]});
  }
  while(g.food.length<320)g.food.push({x:rand(10,1590),y:rand(10,990)});
  if(now>=room.deadline)finishGame(room);
}
function checkElimination(room,now){
  if(room.status!=='playing'||!['snake','cellwars'].includes(room.mode))return;
  const actors=room.mode==='snake'?room.game.snakes:room.game.cells;
  const alive=actors.filter(p=>room.mode==='snake'?p.alive:p.deadUntil<=now);
  const teams=new Set(alive.map(p=>p.team));
  if(teams.size<2){
    room.eliminationWinner=teams.size===1?[...teams][0]:null;
    finishGame(room);
  }
}
function finishGame(room){
  if(room.status!=='playing')return;
  const mode=room.mode,g=room.game;
  let gains={L:0,S:0};let summary='';
  if(mode==='tictactoe'||mode==='connect4'){
    for(const d of g.duels){
      if(!d.finished){d.finished=true;d.winner='draw';d.endReason='Zeit abgelaufen';}
      if(d.winner==='draw'){gains.L+=25;gains.S+=25;}
      else gains[d.winner]+=100;
    }
    summary=`${g.duels.length} Duell${g.duels.length!==1?'e':''} abgeschlossen`;

}else if(mode==='wordle'){
 for(const d of g.duels){
  if(!d.finished){
   d.finished=true;
   d.winner='draw';
  }

  if(d.winner==='L')gains.L+=100;
  else if(d.winner==='S')gains.S+=100;
 }

 summary='Wordle Battle: 100 Punkte pro gewonnenem Duell';

  
}else if(mode==='mathquiz'){
 for(const d of g.duels){gains.L+=d.scores.L;gains.S+=d.scores.S;}
 summary='Mathepunkte aller Teammitglieder';
}else if(mode==='snake'){
 for(const s of g.snakes){
  if(s.team==='L'||s.team==='S')gains[s.team]+=Math.floor(s.score);
 }
 summary='Alle gesammelten Schlangenpunkte des Teams werden addiert';
}else if(mode==='cellwars'){
 for(const c of g.cells){
  if(c.team==='L'||c.team==='S')gains[c.team]+=Math.floor(c.score);
 }
 summary='Alle gesammelten Zellenpunkte des Teams werden addiert';
}

  const winner=room.eliminationWinner||(gains.L===gains.S?'draw':gains.L>gains.S?'L':'S');
  room.eliminationWinner=null;
  room.scores.L+=gains.L;room.scores.S+=gains.S;
  room.result={winner,gains,summary,mode,round:room.round};
  room.history.push(room.result);
  room.status=room.round>=room.options.rounds?'finished':'results';
  room.resultsEnd=room.status==='results'?Date.now()+10000:null;
  room.deadline=null;
  room.game=null;
  broadcast(room);
}
function onMessage(peer,msg){
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  if(msg.type==='create'){
    if(rooms.size>=MAX_ROOMS){error(peer,'Gerade sind zu viele Lobbys offen.');return;}
    if(peer.player){error(peer,'Verlasse zuerst deine Lobby.');return;}
    const code=makeCode();const room={code,hostId:null,players:[],status:'lobby',options:{rounds:5,games:[...GAMES]},scores:{L:0,S:0},round:0,mode:null,deadline:null,history:[],game:null,result:null,sequence:[]};
    rooms.set(code,room);peer.color=msg.color;peer.accessory=msg.accessory;joinRoom(peer,room,msg.name,msg.pet);return;
  }
  if(msg.type==='join'){
    const code=String(msg.code||'').toUpperCase().trim();const room=rooms.get(code);
    if(!room){error(peer,'Diese Lobby existiert nicht. Pruefe den Code.');return;}
    peer.color=msg.color;peer.accessory=msg.accessory;joinRoom(peer,room,msg.name,msg.pet);return;
  }
  if(msg.type==='leave'){leave(peer);peer.send({type:'left'});return;}
  const room=current(peer);if(!room)return;
  const player=peer.player.player;
  if(msg.type==='addbot'){
    if(!host(peer)||room.status!=='lobby')return;
    if(!['L','S'].includes(msg.team))return;
    if(!addBot(room,msg.team))error(peer,'Kein freier Platz im Team oder in der Lobby.');
    return;
  }
  if(msg.type==='removebot'){
    if(!host(peer)||room.status!=='lobby')return;
    removeBot(room,String(msg.id||''));return;
  }
  if(msg.type==='pet'||msg.type==='customize'){
    if(room.status!=='lobby')return;
    if(msg.pet!==undefined)player.pet=safePet(msg.pet);
    if(msg.color!==undefined)player.color=safeColor(msg.color);
    if(msg.accessory!==undefined)player.accessory=safeAccessory(msg.accessory);
    broadcast(room);return;
  }
  if(msg.type==='team'){
    if(room.status!=='lobby')return;
    if(!['L','S'].includes(msg.team))return;
    if(playersOf(room,msg.team).length>=10&&player.team!==msg.team){error(peer,'Dieses Team ist voll.');return;}
    player.team=msg.team;player.ready=false;broadcast(room);return;
  }
  if(msg.type==='ready') {if(room.status==='lobby'&&player.team){player.ready=!player.ready;broadcast(room);}return;}
  if(msg.type==='options'){
    if(!host(peer)||room.status!=='lobby')return;
    const rounds=Number(msg.rounds);
    const games=Array.isArray(msg.games)?[...new Set(msg.games.filter(x=>GAMES.includes(x)))]:null;
    if([1,3,5,7,9].includes(rounds))room.options.rounds=rounds;
    if(games?.length)room.options.games=games;
    broadcast(room);return;
  }
  if(msg.type==='start'){
    if(!host(peer)||room.status!=='lobby')return;
    const balanceError=ensureBalancedTeams(room);if(balanceError){error(peer,balanceError);return;}
    startSeries(room);return;
  }
  if(msg.type==='next')return; // Automatic progression is server-controlled.
  if(msg.type==='back'){
    if(!host(peer)||room.status!=='finished')return;
    resetRoom(room);broadcast(room);return;
  }
  if(msg.type==='mathanswer'&&room.status==='playing'&&room.mode==='mathquiz'){answerMath(room,player,msg);return;}
  if(msg.type==='wordguess'&&room.status==='playing'&&room.mode==='wordle'){guessWordle(room,player,msg);return;}
  if(msg.type==='move'&&room.status==='playing'&&(room.mode==='tictactoe'||room.mode==='connect4')){
    playDuel(room,player,msg);return;
  }
  if(msg.type==='input'&&room.status==='playing'){
    const dx=Number(msg.dx),dy=Number(msg.dy);
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>1||Math.abs(dy)>1)return;
    if(room.mode==='snake'){
      const s=room.game.snakes.find(s=>s.id===player.id&&s.alive);if(!s)return;
      if(Math.abs(dx)+Math.abs(dy)<.05)return;
      s.targetAngle=Math.atan2(dy,dx);if(msg.boost&&s.score>5){s.boost=Date.now()+160;s.score=Math.max(0,s.score-.08);}
    }
    if(room.mode==='cellwars'){
      const c=room.game.cells.find(c=>c.id===player.id);if(!c)return;
      if(msg.split&&c.mass>=18&&Date.now()>c.splitUntil){c.splitUntil=Date.now()+4500;c.boostUntil=Date.now()+550;c.mass=Math.floor(c.mass*.7);c.r=clamp(15+Math.sqrt(c.mass)*1.8,15,46);c.x=clamp(c.x+dx*55,c.r,room.game.width-c.r);c.y=clamp(c.y+dy*55,c.r,room.game.height-c.r);}
      const len=Math.hypot(dx,dy);c.dx=len?dx/len:0;c.dy=len?dy/len:0;
    }
  }
}

function tickBots(room,now){
  if(room.status!=='playing')return;
  if(room.mode==='tictactoe'||room.mode==='connect4'){
    for(const d of room.game.duels){
      if(d.finished)continue;
      const id=d.turn==='L'?d.l:d.s;
      const bot=room.players.find(p=>p.id===id&&p.bot)||(isRoundBot(room,id)?{id,team:d.turn,bot:true}:null);
      if(!bot||now-d.turnSince<450)continue;
      const cells=d.board;
      let col,row;
      if(room.mode==='tictactoe'){
        const open=cells.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
        if(!open.length)continue;
        let chosen=open[Math.floor(Math.random()*open.length)];
        for(const side of [bot.team,bot.team==='L'?'S':'L']){
          const winning=open.find(i=>{const b=[...cells];b[i]=side;return evaluateTTT(b)===side;});
          if(winning!==undefined){chosen=winning;break;}
        }
        row=Math.floor(chosen/3);col=chosen%3;
      }else{
        const open=[0,1,2,3,4,5,6].filter(c=>cells[c]===null);
        if(!open.length)continue;
        col=open[Math.floor(Math.random()*open.length)];
        for(const side of [bot.team,bot.team==='L'?'S':'L']){
          const winning=open.find(c=>{
            const b=[...cells];for(let r=5;r>=0;r--)if(b[r*7+c]===null){b[r*7+c]=side;break;}
            return evaluateConnect(b)===side;
          });
          if(winning!==undefined){col=winning;break;}
        }
      }
      playDuel(room,bot,{duel:d.id,row,col});
    }
  }else if(room.mode==='mathquiz'){
    for(const d of room.game.duels){
      if(now<d.nextAt)continue;
      for(const [id,team] of [[d.l,'L'],[d.s,'S']]){
        const bot=room.players.find(p=>p.id===id&&p.bot)||(isRoundBot(room,id)?{id,team,bot:true}:null);
        if(!bot)continue;
        // One deliberate bot attempt per ~2 seconds, never random question replacement.
        if(now-(d.attemptAt[id]||0)<1850||Math.random()>.045)continue;
        answerMath(room,bot,{duel:d.id,questionId:d.questionId,answer:Math.random()<.82?d.question.answer:d.question.answer+1});
      }
    }



}else if(room.mode==='wordle'){
 for(const d of room.game.duels){
  if(d.finished)continue;

  for(const [id,team] of [[d.l,'L'],[d.s,'S']]){
   const bot=room.players.find(p=>p.id===id&&p.bot)
    ||(isRoundBot(room,id)?{id,team,bot:true}:null);

   if(!bot)continue;
   if(d.finished)break;

   if(!d.nextBotGuessAt){
    d.nextBotGuessAt={
     L:now+4000,
     S:now+4000
    };
   }

   if(now<d.nextBotGuessAt[team])continue;

   const tries=d.guesses[team].length;

   if(tries>=WORDLE_MAX_GUESSES)continue;

   let word;

   if(tries>=3&&Math.random()<0.35){
    word=d.answer;
   }else{
    word=wordlePick();
   }

   guessWordle(room,bot,{duel:d.id,word});

   d.nextBotGuessAt[team]=now+4500+Math.random()*3000;
  }
 }


  }else if(room.mode==='snake'){
    for(const sn of room.game.snakes){
      if(!sn.alive||!room.players.some(p=>p.id===sn.id&&p.bot))continue;
      const f=room.game.food.reduce((best,f)=>!best||Math.hypot(f[0]-sn.x,f[1]-sn.y)<Math.hypot(best[0]-sn.x,best[1]-sn.y)?f:best,null);
      const danger=room.game.snakes.some(other=>other.id!==sn.id&&other.alive&&other.body.some((p,i)=>i%3===0&&Math.hypot(p[0]-sn.x,p[1]-sn.y)<40));
      const wall=sn.x<70||sn.x>1130||sn.y<70||sn.y>690;
      const target=wall?[600,380]:danger?[600+Math.random()*80,380+Math.random()*80]:f;
      if(target)sn.targetAngle=Math.atan2(target[1]-sn.y,target[0]-sn.x);
    }
  }else if(room.mode==='cellwars'){
    for(const c of room.game.cells){
      if(!room.players.some(p=>p.id===c.id&&p.bot)||c.deadUntil>now)continue;
      const enemies=room.game.cells.filter(x=>x.team!==c.team&&!x.deadUntil&&x.r>c.r*1.17&&Math.hypot(x.x-c.x,x.y-c.y)<150);
      const threat=enemies.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
      const target=threat||room.game.food.reduce((best,f)=>!best||Math.hypot(f.x-c.x,f.y-c.y)<Math.hypot(best.x-c.x,best.y-c.y)?f:best,null);
      if(!target)continue;
      const dx=(threat?-1:1)*(target.x-c.x),dy=(threat?-1:1)*(target.y-c.y),len=Math.hypot(dx,dy)||1;
      c.dx=dx/len;c.dy=dy/len;
    }
  }
}
let lastBroadcast=0;
setInterval(()=>{
  const now=Date.now();
  for(const room of rooms.values()){
    if(room.status==='results'){if(now>=room.resultsEnd)startRound(room);continue;}
    if(room.status==='briefing'){
      if(now>=room.briefingEnd){room.status='preview';broadcast(room);}
      continue;
    }
    if(room.status==='preview'){
      if(now>=room.previewEnd)activateRound(room);
      continue;
    }
    tickBots(room,now);
    if(room.status!=='playing')continue;
    if(room.mode==='snake'){tickSnake(room,now);if(room.status==='playing')checkElimination(room,now);}
    else if(room.mode==='cellwars'){tickCell(room,now);if(room.status==='playing')checkElimination(room,now);}
    else if(room.mode==='mathquiz'||room.mode==='wordle'){if(now>=room.deadline)finishGame(room);}
    else if(room.mode==='tictactoe'||room.mode==='connect4'){
      for(const d of room.game.duels){
        if(!d.finished&&now-d.turnSince>=24000){d.finished=true;d.winner=d.turn==='L'?'S':'L';d.endReason='Zugzeit abgelaufen';}
      }
      if(room.game.duels.every(d=>d.finished)||now>=room.deadline)finishGame(room);
    }
    if(now>=room.deadline&&room.status==='playing')finishGame(room);
    if(room.status==='playing'&&(room.mode==='snake'||room.mode==='cellwars')&&now-(room.lastBroadcast||0)>=80){room.lastBroadcast=now;broadcast(room);}
  }
  if(now-lastBroadcast>=100)lastBroadcast=now;
},30).unref();

httpServer.listen(PORT,HOST,()=>{
  console.log('\n  MIR EGAL - Multiplayer Minigames');
  console.log('  Lokal starten: http://localhost:'+PORT);
  console.log('  Mit STRG + C beenden\n');
});

module.exports={httpServer,rooms,evaluateTTT,evaluateConnect};
