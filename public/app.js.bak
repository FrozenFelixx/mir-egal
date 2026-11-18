
'use strict';

const app = document.getElementById('app');
const STAR_PETS=[['bunny','🐰','Bunny'],['cat','🐱','Cat'],['hedgehog','🦔','Igel'],['fox','🦊','Fuchs'],['bat','🦇','Fledermaus'],['star','🌟','Stern']];
const getPet=()=>{try{return localStorage.getItem('mir-egal-pet')||'bunny'}catch{return 'bunny'}};
const petEmoji=(pet)=>STAR_PETS.find(x=>x[0]===pet)?.[1]||'🐰';
const getColor=()=>{try{return localStorage.getItem('me-color')||'lavender'}catch{return 'lavender'}};
const getAccessory=()=>{try{return localStorage.getItem('me-accessory')||'none'}catch{return 'none'}};
const avatarOf=id=>getPlayer(id)||{pet:String(id).includes('roundbot-S')?'bunny':'cat',color:'mint',accessory:'bow'};
const avatarHTML=(id,cls='')=>StarAvatar.html(avatarOf(id),cls);
const ownAvatar=()=>StarAvatar.html({pet:getPet(),color:getColor(),accessory:getAccessory()},'avatar-hero');
const COLOR_LABELS={rose:'Rosa',blue:'Hellblau',mint:'Mint',gold:'Gold',lavender:'Flieder',peach:'Pfirsich'};
const ACCESSORY_LABELS={none:'Ohne',bow:'Schleife',crown:'Krone',glasses:'Brille',scarf:'Schal'};
const accessoryIcons={none:'×',bow:'🎀',crown:'♛',glasses:'◎',scarf:'〰'};
function appearancePicker(){
 return `<div class="appearance-picker">
  <div class="character-spotlight" id="character-preview">${ownAvatar()}<div><strong>Deine Tiergruppe</strong></div></div>
  <div class="appearance-label">Farbe</div><div class="swatch-row">${Object.entries(StarAvatar.COLORS).map(([id,color])=>`<button type="button" title="${COLOR_LABELS[id]}" aria-label="${COLOR_LABELS[id]}" aria-pressed="${getColor()===id}" class="swatch ${getColor()===id?'chosen':''}" style="--swatch:${color}" data-action="color" data-color="${id}"></button>`).join('')}</div>
  <div class="appearance-label">Zubehör</div><div class="accessory-row">${Object.keys(ACCESSORY_LABELS).map(id=>`<button class="accessory-button ${getAccessory()===id?'chosen':''}" type="button" data-action="accessory" data-accessory="${id}" title="${ACCESSORY_LABELS[id]}" aria-pressed="${getAccessory()===id}">${accessoryIcons[id]}</button>`).join('')}</div>
 </div>`;
}
function refreshAppearance(){
 const preview=document.getElementById('character-preview');if(preview)preview.innerHTML=`${ownAvatar()}<div><strong>Deine Tiergruppe</strong></div>`;
 document.querySelectorAll('.swatch').forEach(el=>{let selected=el.dataset.color===getColor();el.classList.toggle('chosen',selected);el.setAttribute('aria-pressed',String(selected));});
 document.querySelectorAll('.accessory-button').forEach(el=>{let selected=el.dataset.accessory===getAccessory();el.classList.toggle('chosen',selected);el.setAttribute('aria-pressed',String(selected));});
}

const petByName=(name)=>STAR_PETS[[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%STAR_PETS.length][1];
const starDecor=()=>'<div class="starfield" aria-hidden="true"><span>✦</span><span>✧</span><span>✶</span><span>✦</span><span>✧</span><span>✦</span><span>✶</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span><span>✶</span></div>';

const toastBox = document.getElementById('toast');
const GAME_INFO = {
 tictactoe:{name:'Tic-Tac-Toe',icon:'❌⭕',short:'3 in einer Reihe',hint:'Klicke auf ein freies Feld. Du hast 24 Sekunden pro Zug.'},
 connect4:{name:'4 Gewinnt',icon:'🔵🟡',short:'4 in einer Reihe',hint:'Klicke auf eine Spalte. Du hast 24 Sekunden pro Zug.'},
 snake:{name:'Schlangenkreuzung',icon:'🐍',short:'Alle gegen alle',hint:'Steuere mit WASD oder den Pfeiltasten. Sammle Futter und vermeide Kollisionen mit den Wänden oder anderen Spielern.'},
 mathquiz:{name:'Mathequiz',icon:'🧮',short:'Schnell rechnen',hint:'Löse Aufgaben schneller als dein Gegner. Richtige Antworten bringen Punkte, falsche ziehen welche ab.'},
 cellwars:{name:'Fresskampf',icon:'⚔️',short:'Masse sammeln, andere fressen',hint:'Steuere mit WASD oder den Pfeiltasten. Größere Zellen können kleinere Gegnerzellen verschlingen.'},
 wordle:{name:'Wordle Battle',icon:'🟩',short:'Wortduell',hint:'Errate das geheime Wort mit 5 Buchstaben vor deinem Gegner. Grün = richtig, Gelb = falsche Position, Grau = nicht enthalten.'}
};

let socket=null, myId=null, room=null, screenKey='', chosenDuel=null, serverOffset=0, inputTimer=0, toastTimer=0;
let loading=false;
let visualPrev=null,visualNext=null,visualReceivedAt=0,lastLeaders=0,lastFrame=0,particles=[];

let spectatorTarget=null;
let spectatorMode=null;

const deathState={
 active:false,
 startedAt:0,
 duration:2300,
 mode:null,
 lastAlive:true,
 targetId:null,
 particles:[]
};

function arenaAlive(actor,mode,now){
 if(!actor)return false;
 return mode==='snake'?actor.alive:actor.deadUntil<=now;
}

function updateDeathState(g){
 if(!room||!['snake','cellwars'].includes(room.mode))return;

 const mode=room.mode;
 const actors=mode==='snake'?g.snakes:g.cells;
 const self=actors.find(p=>p.id===myId);
 const now=Date.now()+serverOffset;
 const alive=arenaAlive(self,mode,now);

 if(deathState.mode!==mode){
  deathState.mode=mode;
  deathState.lastAlive=true;
  deathState.active=false;
  deathState.targetId=null;
  spectatorTarget=null;
 }

 if(deathState.lastAlive&&!alive&&room.status==='playing'){
  deathState.active=true;
  deathState.startedAt=performance.now();
  deathState.targetId=myId;

  deathState.particles=Array.from({length:26},(_,i)=>({
   angle:Math.PI*2*i/26+Math.random()*.25,
   speed:80+Math.random()*210,
   size:4+Math.random()*9,
   rotation:Math.random()*Math.PI*2,
   type:i%3===0?'star':'circle',
   color:['#ffe66d','#ff83bd','#69e9e2','#c6a2ff'][i%4]
  }));

  window.StarSound?.play?.('death');
 }

 if(alive&&deathState.active){
  deathState.active=false;
  spectatorTarget=null;
 }

 deathState.lastAlive=alive;

 if(deathState.active&&performance.now()-deathState.startedAt>=deathState.duration){
  deathState.active=false;
 }
}

function getArenaSpectator(g){
 const team=me()?.team;
 if(!team)return null;

 const now=Date.now()+serverOffset;
 const actors=room.mode==='snake'?g.snakes:g.cells;
 const alive=p=>room.mode==='snake'?p.alive:p.deadUntil<=now;

 const self=actors.find(p=>p.id===myId);

 if(self&&alive(self)){
  spectatorTarget=null;
  return self;
 }

 const teammates=actors.filter(p=>p.team===team&&p.id!==myId&&alive(p));

 if(!teammates.length){
  spectatorTarget=null;
  return null;
 }

 let target=teammates.find(p=>p.id===spectatorTarget);

 if(!target){
  target=teammates[Math.floor(Math.random()*teammates.length)];
  spectatorTarget=target.id;
 }

 return target;
}

const petFor=id=>petEmoji(getPlayer(id)?.pet||(id===myId?getPet():'bunny'));
let lastCountdownAudio=null;
function playEffect(name){window.StarSound?.play(name)}
function celebrate(label,kind='good',at=null){
 if(document.hidden)return;
 const p=document.createElement('div');p.className=`point-pop ${kind}`;p.textContent=label;
 const x=at?.x??(innerWidth*.5),y=at?.y??(innerHeight*.42);
 p.style.left=`${Math.max(50,Math.min(innerWidth-50,x))}px`;p.style.top=`${Math.max(50,Math.min(innerHeight-50,y))}px`;
 document.body.appendChild(p);p.addEventListener('animationend',()=>p.remove(),{once:true});
 const max=5;
 for(let i=0;i<max;i++){
  const spark=document.createElement('i');spark.className=`effect-spark ${kind}`;spark.style.left=`${x}px`;spark.style.top=`${y}px`;
  spark.style.setProperty('--dx',`${(Math.random()-.5)*120}px`);spark.style.setProperty('--dy',`${-20-Math.random()*90}px`);
  document.body.appendChild(spark);spark.addEventListener('animationend',()=>spark.remove(),{once:true});
 }
}
function feedbackAt(target,label,kind){const rect=target?.getBoundingClientRect();celebrate(label,kind,rect?{x:rect.left+rect.width/2,y:rect.top+rect.height*.35}:null);}
function handleStateEffects(old,now){
 if(!old||old.code!==now.code)return;
 if(old.status!==now.status){
  if(now.status==='playing'){playEffect('start');}
  if(['results','finished'].includes(now.status)){playEffect('win');}
 }
 if(now.status==='playing'&&old.status==='playing'&&now.round===old.round&&now.mode===old.mode){
  if(now.mode==='mathquiz'){
   for(const d of now.game?.duels||[]){
    const prev=old.game?.duels?.find(x=>x.id===d.id);
    const f=d.lastFeedback;if(!f||f.seq===prev?.lastFeedback?.seq)continue;
    if(f.playerId===myId){
     feedbackAt(document.querySelector('.math-question'),f.delta>0?`+${f.delta} ✦`:`${f.delta} ✕`,f.delta>0?'good':'bad');
     playEffect(f.correct?'correct':'wrong');
     const card=document.querySelector('.math-card');card?.classList.remove('correct-flash','wrong-flash');void card?.offsetWidth;card?.classList.add(f.correct?'correct-flash':'wrong-flash');
    }else if(d.l===myId||d.s===myId){
     const rivalTeam=f.team;
     const rival=document.querySelector(`.math-opponent:has([data-math-score="${rivalTeam}"])`);
     feedbackAt(rival,f.correct?'Gegner +10':'Gegner −5',f.correct?'good':'bad');
     playEffect(f.correct?'score':'wrong');
    }
   }
  }
  if(['snake','cellwars'].includes(now.mode)){
   const list=now.mode==='snake'?'snakes':'cells';
   const curr=now.game?.[list]?.find(x=>x.id===myId),prev=old.game?.[list]?.find(x=>x.id===myId);
   const delta=curr&&prev?Math.round((curr.score-prev.score)*100)/100:0;
   if(delta>=2){
    feedbackAt(document.getElementById('arena'),`+${Math.round(delta)} ✦`,'good');playEffect('score');
   }
  }
 }
 if(old.status!=='results'&&old.status!=='finished'&&['results','finished'].includes(now.status)){
  setTimeout(()=>{for(const x of document.querySelectorAll('.result-score strong'))x.classList.add('reward-bump')},50);
 }
}
const gameDescriptions={
 tictactoe:'Setze abwechselnd dein Symbol auf das 3×3-Spielfeld. Drei in einer Reihe gewinnen. Du hast 24 Sekunden pro Zug.',
 connect4:'Wirf deine Steine in eine Spalte. Vier gleiche Steine waagerecht, senkrecht oder diagonal gewinnen.',
 snake:'Schlängle dich frei durch den Sternenstaub. Sammle Lichtpunkte, wachse und schneide anderen den Weg ab. WASD / Pfeiltasten zum Lenken.',
 mathquiz:'Rechne schneller als dein Gegner! Tippe das Ergebnis ein und bestätige mit Enter. Jede richtige Antwort bringt Punkte.',
 cellwars:'Sammle Sterne, wachse und verschlinge kleinere Gegner. Powerups können dir gut weiterhelfen.',
 wordle:'Zwei Spieler, ein geheimes Wort! Beide sehen die Versuche des anderen live. Wer das Wort zuerst errät, gewinnt 100 Punkte. Ihr habt maximal 90 Sekunden.'
};

const keys=new Set();let mouseDirection=null,lastInput='',lastInputAt=0,splitRequested=false;
const nameFromStorage=()=>{try{return localStorage.getItem('mir-egal-name')||''}catch{return ''}};
const saveName=n=>{try{localStorage.setItem('mir-egal-name',n)}catch{}};
const storedCode=new URLSearchParams(location.search).get('room')?.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x]));
const getPlayer=id=>room?.players.find(p=>p.id===id);
const playerName=id=>getPlayer(id)?.name||(String(id).startsWith('roundbot-')?'Sternenbot':'Spieler');
const me=()=>getPlayer(myId);
const isHost=()=>room?.hostId===myId;
const getName=()=>document.getElementById('username')?.value.trim().slice(0,18)||nameFromStorage()||'Spieler';
const say=(message)=>{toastBox.textContent=message;toastBox.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastBox.classList.remove('visible'),3300)};
const send=(type,extra={})=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...extra}));};

function connectAnd(type,payload){
 if(loading)return;
 loading=true;
 if(socket&&socket.readyState===WebSocket.OPEN){loading=false;send(type,payload);return;}
 const protocol=location.protocol==='https:'?'wss:':'ws:';
 socket=new WebSocket(`${protocol}//${location.host}/ws`);
 socket.addEventListener('open',()=>{loading=false;send(type,payload)});
 socket.addEventListener('message',event=>{
  let data;try{data=JSON.parse(event.data)}catch{return}
  if(data.type==='error'){loading=false;say('⚠ '+data.message);return}
  if(data.type==='joined'){
   myId=data.id;chosenDuel=null;loading=false;
   const u=new URL(location.href);u.searchParams.set('room',data.code);history.replaceState({},'',u);
  }
  if(data.type==='left'){
   room=null;myId=null;screenKey='';
   const u=new URL(location.href);u.searchParams.delete('room');history.replaceState({},'',u);
   render();
  }
  if(data.type==='state'){
   const old=room;
   if(['playing','preview'].includes(data.room.status)&&['snake','cellwars'].includes(data.room.mode)){
    visualPrev=visualNext;
    visualNext=data.room.game;
    visualReceivedAt=performance.now();
   }else{visualPrev=null;visualNext=null;}
   room=data.room;serverOffset=room.serverNow-Date.now();
   const key=`${room.code}|${room.status}|${room.round}|${room.mode}`;

   if(key!==screenKey){
    screenKey=key;
    chosenDuel=null;
    keys.clear();
    mouseDirection=null;
    lastCountdownAudio=null;
    deathState.mode=null;
    deathState.active=false;
    deathState.lastAlive=true;
    spectatorTarget=null;
    render();
   }
   else if(['playing','preview'].includes(room.status)&&['snake','cellwars'].includes(room.mode)){
    updateTimer();
   }else if(room.status==='playing'&&room.mode==='mathquiz')updateMath();
   else if(room.status==='playing'&&room.mode==='wordle')updateWordle();
   else if(['playing','preview'].includes(room.status)&&['tictactoe','connect4'].includes(room.mode))updateDuel();
   else if(room.status==='lobby')render();
   else updateTimer();
   updateScoreHeader();
   handleStateEffects(old,room);
  }
 });
 socket.addEventListener('error',()=>{loading=false;say('Server nicht erreichbar. Ist START_MIR_EGAL.bat gestartet?')});
 socket.addEventListener('close',()=>{
  const wasInRoom=!!room;
  loading=false;room=null;myId=null;screenKey='';chosenDuel=null;keys.clear();
  if(wasInRoom)say('Verbindung unterbrochen. Bitte der Lobby erneut beitreten.');
  render();
 });
}

const header=()=>starDecor()+`<header class="topbar"><div class="brand"><div class="logo">✦</div><div>MIR <em>EGAL.</em><small class="server-subtitle">✧ STERNENSTAUB ✧</small></div></div>
 <div class="topright"><button class="audio-toggle" type="button" data-action="sound" aria-label="Soundeffekte an oder aus" title="Sound an/aus">${StarSound.enabled?'🔊 Ton AN':'🔇 Ton AUS'}</button><button class="audio-toggle" type="button" data-action="music" aria-label="Hintergrundmusik an oder aus" title="Musik an/aus">${StarSound.musicOn?'♫ Musik AN':'♫ Musik AUS'}</button>${room?`<span class="pill">LOBBY <span class="room-code" style="font-size:12px;letter-spacing:1px">${esc(room.code)}</span></span>`:''}<span class="online"><span class="dot"></span> Multiplayer online</span>${room?`<button class="icon-btn" data-action="leave">✕ Verlassen</button>`:''}</div></header>`;

function renderHome(){
 app.innerHTML=header()+`
 <main class="home-new">

  <section class="home-intro">
   <h1 class="title">
    <span class="gradient-text">MIR EGAL<br>Das offizielle Discord Sternenstaub Spiel</span>
   </h1>
   <p class="sub">Der Große Kampf zwischen Team Lara und Team Soul 🌠</p>
   <div class="features">
    <span class="feature">Multiplayer</span>
    <span class="feature">Bis zu 20 Spieler</span>
    <span class="feature">Entwickler: FelixFries</span>
   </div>
  </section>

  <div class="home-content">

   <section class="home-box home-avatar">
    <div class="eyebrow">DEIN STERNENWESEN</div>
    <h3>Avatareditor</h3>

    <label class="form-label pet-label">
     DEIN STERNENWESEN
     <span class="pet-hint">(lokal auf deinem Gerät)</span>
    </label>

    <div class="pet-picker">
     ${STAR_PETS.map(([id,emoji,label])=>`
      <button type="button"
       class="pet-option ${getPet()===id?'selected':''}"
       data-action="pet"
       data-pet="${id}"
       title="${label}"
       aria-label="${label}"
       aria-pressed="${getPet()===id}">
       ${emoji}
      </button>
     `).join('')}
    </div>

    ${appearancePicker()}
   </section>
   <section class="home-games">
    <div class="eyebrow">✦ STERNENSTAUB</div>
    <h2>Minispiele</h2>

    <div class="preview-grid">
     <div class="preview-tile">
      <div><h4>Tic-Tac-Toe</h4><p>Kopf an Kopf</p></div>
      <div class="preview-visual">✕○✕</div>
     </div>

     <div class="preview-tile">
      <div><h4>4 Gewinnt</h4><p>Strategie gewinnt</p></div>
      <div class="preview-visual pink">●●●●</div>
     </div>

     <div class="preview-tile">
      <div><h4>Slither Stars</h4><p>Überlebe die Arena</p></div>
      <div class="preview-visual green">▦ ▰</div>
     </div>

     <div class="preview-tile">
      <div><h4>Agar Arena</h4><p>Werde zur größten Zelle</p></div>
      <div class="preview-visual yellow">◉ ◉</div>
     </div>

     <div class="preview-tile">
      <div><h4>Mathquiz</h4><p>Wer rechnet schneller?</p></div>
      <div class="preview-visual">7 × 8 = ?</div>
     </div>

     <div class="preview-tile">
      <div><h4>Wordle Battle</h4><p>Errate das Wort zuerst!</p></div>
      <div class="preview-visual green">🟩🟨⬜</div>
     </div>
    </div>
   </section>

   <section class="home-box home-lobby">
    <div class="eyebrow">LOS GEHT'S</div>
    <h3 style="margin-top:10px">Bereit für ein Match?</h3>

    <label for="username" class="form-label">DEIN SPIELERNAME</label>
    <input id="username" class="field" maxlength="18"
     autocomplete="nickname" placeholder="Wie heißt du?"
     value="${esc(nameFromStorage())}">

    <button class="btn btn-primary btn-full"
     style="margin-top:17px" data-action="create">
     ✦ Neue Lobby erstellen
    </button>

    <div class="separator">ODER EINER LOBBY BEITRETEN</div>

    <label for="joincode" class="form-label" style="margin-top:0">
     LOBBY-CODE
    </label>

    <div class="join-row">
     <input id="joincode" class="field field-code"
      maxlength="6" placeholder="ABC123"
      value="${esc(storedCode)}">
     <button class="btn btn-secondary" data-action="join">
      Beitreten →
     </button>
    </div>

    <div class="notice" style="margin-top:19px">
     💡 Freunde können mit dem Lobby-Code oder einem Einladungslink
     beitreten. Der Host muss den Spielserver erreichbar machen.
    </div>
   </section>

  </div>
 </main>
 <div class="footer">🌠 STERNENSTAUB 🌠 · MIR EGAL</div>`;
}

function teamCard(team){
 const members=room.players.filter(p=>p.team===team);
 const joined=me()?.team===team;
 return `<section class="panel team-panel"><div class="team-header ${team}"><div class="team-badge"><span class="team-avatar ${team}">${team}</span><span>TEAM ${team}</span></div><span class="pill ${team.toLowerCase()}">${members.length} / 10</span></div>
  <div class="playerlist">${members.length?members.map(p=>`<div class="player"><span class="avatar pet-avatar">${avatarHTML(p.id)}</span><span class="name">${esc(p.name)} ${p.id===room.hostId?'♛':''}</span>${p.id===myId?'<span class="you">DU</span>':''}${p.bot?'<span class="bot-tag">🤖 BOT</span>':''}${p.bot&&isHost()?`<button class="bot-remove" data-action="removebot" data-id="${p.id}" title="Bot entfernen">✕</button>`:''}<span title="Bereit" style="color:${p.ready?'#66ddae':'#77798f'}">${p.ready?'✓':'○'}</span></div>`).join(''):'<div class="player-empty">Noch niemand in diesem Team.<br>Sei der Erste!</div>'}</div>
  <div class="team-action">${isHost()?`<button class="bot-add" data-action="addbot" data-team="${team}" ${members.length>=10||room.players.length>=20?'disabled':''}>＋ 🤖 Bot zu Team ${team}</button>`:''}<button class="join-team ${team==='S'?'S':''} ${joined?'active':''}" data-action="team" data-team="${team}" ${joined||members.length>=10?'disabled':''}>${joined?'✓ Du bist in Team '+team:members.length>=10?'Team voll':'Team '+team+' beitreten →'}</button></div></section>`;
}

function renderLobby(){
 const lCount=room.players.filter(p=>p.team==='L').length,sCount=room.players.filter(p=>p.team==='S').length;
 const canPlay=lCount>0&&sCount>0&&Math.abs(lCount-sCount)<=1;
 const hostView=isHost();
 app.innerHTML=header()+`<main><div class="section-head"><div><div class="eyebrow">WARTERAUM · ${room.players.length}/20 SPIELER</div><h1>Deine Lobby <span class="gradient-text">${esc(room.code)}</span></h1><div class="small">${hostView?'Du bist der Host.':'Warte auf den Host.'} Wähle ein Team und mach dich bereit.</div></div>
  <div style="display:flex;gap:9px;flex-wrap:wrap"><button class="btn btn-secondary btn-small" data-action="copycode">⧉ Code kopieren</button><button class="btn btn-secondary btn-small" data-action="copylink">↗ Einladungslink</button></div></div>
  <div class="lobby-profile"><span class="profile-sticker">${ownAvatar()}</span><div><strong>Dein Sternenwesen</strong><span class="small">${me()?.name?esc(me().name):'Zuschauer'} · Charakterfarbe und Accessoire kannst du im Startmenü ändern.</span></div></div>
  <div class="lobby-grid">${teamCard('L')}${teamCard('S')}</div>
  <div class="lobby-bottom"><section class="panel"><div class="panel-title"><h3>🎮 Minigame-Auswahl</h3><span class="small">${hostView?'Host-Einstellungen':'Vom Host festgelegt'}</span></div>
   <div class="settings-games">${Object.entries(GAME_INFO).map(([key,g])=>`<label class="game-check"><input class="mode-checkbox" type="checkbox" value="${key}" ${room.options.games.includes(key)?'checked':''} ${hostView?'':'disabled'}><span>${esc(g.name)}</span></label>`).join('')}</div>
   <div class="settings-line"><span>Runden pro Match</span><select id="rounds" ${hostView?'':'disabled'}>${[1,3,5,7,9].map(n=>`<option value="${n}" ${room.options.rounds===n?'selected':''}>${n} Runde${n>1?'n':''}</option>`).join('')}</select></div>
   <div class="small" style="margin-top:14px">1-gegen-1-Duelle werden parallel ausgelost. Bei Snake und Cell Wars spielt die ganze Lobby gleichzeitig.</div></section>
   <section class="panel lobby-actions"><div class="panel-title"><h3>🚀 Match starten</h3><span class="pill">${room.options.rounds} Runden</span></div>
    <div class="notice">Mindestens <strong>1 Spieler pro Team</strong>, höchstens <strong>1 Spieler Unterschied</strong>. Maximal 10 je Team. Nicht zugeteilte Spieler können zuschauen.</div>
    <button class="btn btn-secondary btn-full" data-action="ready" ${me()?.team?'':'disabled'}>${me()?.ready?'✓ Bereit – zurücknehmen':'○ Als bereit markieren'}</button>
    ${hostView?`<button class="btn btn-primary btn-full" data-action="start" ${canPlay?'':'disabled'}>⚡ MATCH STARTEN</button><span class="small" style="text-align:center">${canPlay?'Alles bereit! Du kannst starten.':'Beide Teams benötigen Spieler und dürfen sich maximal um 1 unterscheiden.'}</span>`:`<div class="notice green" style="text-align:center">⏳ Der Host startet das Match.</div>`}
   </section></div></main>`;
}

function updateScoreHeader(){
 if(!room)return;
 const l=document.querySelector('.score-value.mark-L'),r=document.querySelector('.score-value.mark-S');
 for(const [el,value] of [[l,room.scores.L],[r,room.scores.S]]){
  if(el&&el.textContent!==String(value)){el.textContent=String(value);el.classList.remove('reward-bump');void el.offsetWidth;el.classList.add('reward-bump');}
 }
}

function scoreBar(){
 return `<div class="scoreboard"><div class="score-side"><span class="team-avatar">L</span><div><div class="small">TEAM L</div><div class="score-value mark-L">${room.scores.L}</div></div></div><div class="score-mid"><span>RUNDE ${room.round} / ${room.rounds}</span><strong>VS</strong></div><div class="score-side right"><div style="text-align:right"><div class="small">TEAM S</div><div class="score-value mark-S">${room.scores.S}</div></div><span class="team-avatar S">S</span></div></div>`;
}

function chooseDuel(){
 if(!room.game?.duels)return null;
 const own=room.game.duels.find(d=>d.l===myId||d.s===myId);
 return own||room.game.duels.find(d=>d.id===chosenDuel)||room.game.duels[0];
}

function renderDuelGame(){
 const duel=chooseDuel();const game=GAME_INFO[room.mode];
 const all=room.game.duels;
 if(duel)chosenDuel=duel.id;
 const myDuel=duel&&(duel.l===myId||duel.s===myId);
 const myTurn=myDuel&&!duel.finished&&duel.turn===me()?.team;
 const canMove=myTurn;
 let board='';
 if(duel){
  if(room.mode==='tictactoe')board=`<div class="ttt-board">${duel.board.map((v,i)=>`<button aria-label="Feld ${i+1}" class="ttt-cell ${v?'mark-'+v:''}" data-action="move" data-duel="${duel.id}" data-row="${Math.floor(i/3)}" data-col="${i%3}" ${!canMove||v?'disabled':''}>${v?(v==='L'?'✕':'○'):''}</button>`).join('')}</div>`;
  else board=`<div class="connect-board">${duel.board.map((v,i)=>`<button aria-label="Spalte ${(i%7)+1}, Reihe ${Math.floor(i/7)+1}" class="connect-cell ${v?'mark-'+v:''}" data-action="move" data-duel="${duel.id}" data-col="${i%7}" ${!canMove||duel.board[i%7]?'disabled':''}></button>`).join('')}</div>`;
 }
 let status='Du schaust diesem Duell zu.';
 if(duel){if(duel.finished)status=duel.winner==='draw'?'🤝 Unentschieden':`🏆 Team ${duel.winner} gewinnt dieses Duell!`;
  else if(myTurn)status='✨ Du bist am Zug!';
  else if(myDuel)status='⏳ Dein Gegner ist am Zug.';
  else status=`Team ${duel.turn} ist am Zug · Zuschauermodus`;
 }
 app.innerHTML=header()+`<main><div class="section-head"><div><div class="eyebrow">SPIEL LÄUFT · RUNDE ${room.round}/${room.rounds}</div><h1>${esc(game.name)} <span class="gradient-text">Battle</span></h1><div class="small">${esc(game.hint)}</div></div><span class="pill">⏱ <span id="timer">--:--</span></span></div>
  ${scoreBar()}<div class="game-layout"><section class="panel game-area"><div class="game-topline"><span class="small">${duel?'DUELL #'+duel.id:'KEIN AKTIVES DUELL'}</span><span class="pill">${all.filter(d=>d.finished).length} / ${all.length} beendet</span></div>
  ${duel?`<div class="versus"><span class="combatant mark-L ${duel.l===myId?'combat-self':'combat-enemy'}">${avatarHTML(duel.l,'versus-sticker')}<span><b>TEAM L</b><em>${esc(playerName(duel.l))}</em></span></span><span class="center">VS</span><span class="combatant mark-S ${duel.s===myId?'combat-self':'combat-enemy'}">${avatarHTML(duel.s,'versus-sticker')}<span><b>TEAM S</b><em>${esc(playerName(duel.s))}</em></span></span></div>${board}`:'<div class="notice">Noch kein Duell verfügbar.</div>'}
  <div class="turn-info">${esc(status)}</div><p class="small" style="text-align:center">${myDuel?'Du spielst in diesem Duell.':'Du kannst andere Duelle beobachten.'}</p></section>
  <aside class="panel game-side"><div class="panel-title"><h3>Alle Duelle</h3><span class="small">${all.length} Paarungen</span></div><div class="side-list">${all.map(d=>`<button class="duel-item ${d.id===chosenDuel?'active':''}" data-action="viewduel" data-duel="${d.id}"><div><strong>#${d.id} ${avatarHTML(d.l,'list-sticker')} ${esc(playerName(d.l))} vs. ${avatarHTML(d.s,'list-sticker')} ${esc(playerName(d.s))}</strong><div><span class="duel-status">${d.finished?(d.winner==='draw'?'Unentschieden':'Team '+d.winner+' gewinnt'):'Am Spielen'}</span></div></div><span>${d.finished?'✓':'●'}</span></button>`).join('')}</div><p class="small" style="line-height:1.7;margin-top:15px">Bei einem Unentschieden bekommen beide Teams 25 Punkte; ein Sieg bringt 100 Punkte.</p></aside>
  </div></main>`;
 updateTimer();
}

function renderBriefing(){
 const game=GAME_INFO[room.mode];
 app.innerHTML=header()+`<main class="briefing-stage">
 <section class="briefing-card">
 <div class="briefing-sparkles">✦ ✧ ✨ ✦ ✧</div>
 <div class="eyebrow">RUNDE ${room.round} / ${room.rounds} · DAS NÄCHSTE MINIGAME</div>
 <div class="briefing-emoji">${room.mode==='snake'?'🐍':room.mode==='cellwars'?'🌟':room.mode==='connect4'?'🔴':room.mode==='wordle'?'🟩':room.mode==='mathquiz'?'🧮':'⭕'}</div>
 <h1>${esc(game.name)}</h1>
 <p class="briefing-description">${esc(gameDescriptions[room.mode]||game.hint)}</p>
 <div class="briefing-timer" id="briefing-timer"><span>Das Spiel beginnt gleich …</span></div>
 <div class="briefing-progress"><div id="briefing-progress"></div></div>
 <p class="small">Team L ⚔️ Team S · Viel Glück, Sternenwesen!</p>
 </section></main>`;
 updateBriefing();
}

function updateBriefing(){
 if(room?.status!=='briefing')return;
 const el=document.getElementById('briefing-timer');
 if(!el)return;
 const left=Math.max(0,(room.briefingEnd-(Date.now()+serverOffset))/1000);
 const progress=document.getElementById('briefing-progress');
 if(progress)progress.style.width=`${Math.max(0,Math.min(100,(10-left)/10*100))}%`;
 el.innerHTML=`<span>Erklärung · noch ${Math.ceil(left)} Sekunden</span>`;
}

function renderPreview(){
 if(['snake','cellwars'].includes(room.mode)){
  renderArenaGame();
 }else{
  if(room.mode==='mathquiz')renderMath();
  else if(room.mode==='wordle')renderWordle();
  else renderDuelGame();
 }
 document.querySelectorAll('[data-action="move"]').forEach(b=>b.disabled=true);
 const stage=document.querySelector('.arena-area')||document.querySelector('.game-layout')||document.querySelector('main');
 if(stage){stage.style.position='relative';stage.insertAdjacentHTML('beforeend',`<div class="prestart-overlay" id="prestart-overlay"><div class="prestart-number" id="prestart-number">3</div><div class="prestart-label">Gleich geht's los!</div><div class="prestart-sub">Schau dich schon mal um. Noch nicht bewegen!</div></div>`);}
 updatePreview();
}

function updatePreview(){
 if(room?.status!=='preview')return;
 const el=document.getElementById('prestart-number');if(!el)return;
 const n=Math.max(1,Math.ceil((room.previewEnd-(Date.now()+serverOffset))/1000));
 if(el.textContent!==String(n)){el.textContent=String(n);el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');if(lastCountdownAudio!==n){playEffect('count');lastCountdownAudio=n;}}
}

function updateDuel(){
 const d=chooseDuel();if(!d)return;
 const board=document.querySelector(room.mode==='tictactoe'?'.ttt-board':'.connect-board');
 if(!board)return;
 const own=d.l===myId||d.s===myId;
 const myTurn=own&&!d.finished&&d.turn===me()?.team;
 [...board.children].forEach((button,i)=>{
  const value=d.board[i];
  button.classList.toggle('mark-L',value==='L');button.classList.toggle('mark-S',value==='S');
  const before=button.dataset.symbol||'';
  const after=value||'';
  if(before!==after){
   button.dataset.symbol=after;
   button.classList.remove('board-pop');
   if(after){void button.offsetWidth;button.classList.add('board-pop');playEffect('tap');}
  }
  if(room.mode==='tictactoe'&&button.textContent!==(value?(value==='L'?'✕':'○'):''))button.textContent=value?(value==='L'?'✕':'○'):'';
  button.disabled=!myTurn||!!value||(room.mode==='connect4'&&!!d.board[i%7]);
 });
 const info=document.querySelector('.turn-info');
 if(info)info.textContent=d.finished?(d.winner==='draw'?'🤝 Unentschieden':`🏆 Team ${d.winner} gewinnt dieses Duell!`):myTurn?'✨ Du bist am Zug!':own?'⏳ Dein Gegner ist am Zug.':`Team ${d.turn} ist am Zug · Zuschauermodus`;
 const count=document.querySelector('.game-topline .pill');if(count)count.textContent=`${room.game.duels.filter(x=>x.finished).length} / ${room.game.duels.length} beendet`;
 document.querySelectorAll('.duel-item').forEach(button=>{const duel=room.game.duels.find(x=>x.id===Number(button.dataset.duel));if(!duel)return;const status=button.querySelector('.duel-status');if(status)status.textContent=duel.finished?(duel.winner==='draw'?'Unentschieden':'Team '+duel.winner+' gewinnt'):'Am Spielen';});
 updateTimer();
}

function updateMath(){
 const d=room.game?.duels.find(x=>x.l===myId||x.s===myId)||room.game?.duels[0];if(!d)return;
 const shown=document.querySelector('.math-question');
 if(shown&&shown.dataset.questionId!==String(d.questionId)){
  shown.dataset.questionId=String(d.questionId);
  shown.innerHTML=`${esc(d.question.text)} <span>= ?</span>`;
  const input=document.getElementById('math-answer');if(input){input.value='';input.focus();}
 }
 for(const team of ['L','S']){
  const el=document.querySelector(`[data-math-score="${team}"]`);
  if(el&&el.textContent!==String(d.scores[team])){
   el.textContent=String(d.scores[team]);el.classList.remove('reward-bump');void el.offsetWidth;el.classList.add('reward-bump');
  }
 }
 updateTimer();
}

function ownWordleDuel(){
 return room.game?.duels?.find(d=>d.l===myId||d.s===myId)||null;
}

function selectedWordleDuel(){
 const own=ownWordleDuel();
 if(own&&!own.finished)return own;

 const selected=room.game?.duels?.find(d=>d.id===chosenDuel);
 if(selected&&!selected.finished)return selected;

 const running=room.game?.duels?.find(d=>!d.finished);
 if(running)return running;

 return selected||own||room.game?.duels?.[0]||null;
}

function wordleBoard(guesses=[]){
 let html='';

 for(let row=0;row<6;row++){
  const guess=guesses[row];
  html+='<div class="wordle-row">';

  for(let col=0;col<5;col++){
   const letter=guess?.word?.[col]||'';
   const mark=guess?.marks?.[col]||'empty';
   html+=`<div class="wordle-tile ${mark}">${esc(letter)}</div>`;
  }

  html+='</div>';
 }

 return html;
}

function wordleStatus(d){
 if(!d)return 'Kein Duell verfügbar.';

 if(d.finished){
  if(d.winner==='draw')return '🤝 Unentschieden – niemand hat das Wort erraten.';
  return `🏆 ${esc(playerName(d.winner==='L'?d.l:d.s))} gewinnt 100 Punkte für Team ${d.winner}!`;
 }

 const own=ownWordleDuel();

 if(own?.id===d.id)return '⚡ Errate das Wort schneller als dein Gegner!';
 if(own?.finished)return '👀 Dein Duell ist vorbei. Du schaust einem anderen Duell zu.';

 return '👀 Du schaust diesem Wortduell zu.';
}

function renderWordle(){
 const d=selectedWordleDuel();
 if(d)chosenDuel=d.id;

 const own=ownWordleDuel();
 const canPlay=room.status==='playing'&&own&&!own.finished&&d?.id===own.id;
 const all=room.game?.duels||[];

 app.innerHTML=header()+`
 <main class="wordle-stage">
  <div class="section-head">
   <div>
    <div class="eyebrow">WORTDUELL · RUNDE ${room.round}/${room.rounds}</div>
    <h1>WORDLE <span class="gradient-text">BATTLE!</span></h1>
    <div class="small">Dasselbe Wort für beide Spieler · Wer zuerst richtig liegt, gewinnt 100 Punkte.</div>
   </div>
   <span class="pill">⏱ <span id="timer">01:30</span></span>
  </div>

  ${scoreBar()}

  <div class="wordle-layout">
   <section class="panel wordle-main">
    <div class="wordle-topline">
     <span class="pill">DUELL #${d?.id||'–'}</span>
     <span class="pill">${all.filter(x=>x.finished).length} / ${all.length} BEENDET</span>
    </div>

    <div class="wordle-battle">
     <div class="wordle-player team-L">
      <div class="wordle-player-head">
       ${d?avatarHTML(d.l,'wordle-avatar'):''}
       <div><span>TEAM L</span><strong>${d?esc(playerName(d.l)):'–'}</strong></div>
       ${d?.winner==='L'?'<span class="wordle-crown">👑</span>':''}
      </div>
      <div class="wordle-grid" id="wordle-board-L">${wordleBoard(d?.guesses?.L)}</div>
     </div>

     <div class="wordle-versus">VS</div>

     <div class="wordle-player team-S">
      <div class="wordle-player-head">
       ${d?avatarHTML(d.s,'wordle-avatar'):''}
       <div><span>TEAM S</span><strong>${d?esc(playerName(d.s)):'–'}</strong></div>
       ${d?.winner==='S'?'<span class="wordle-crown">👑</span>':''}
      </div>
      <div class="wordle-grid" id="wordle-board-S">${wordleBoard(d?.guesses?.S)}</div>
     </div>
    </div>

    <div class="wordle-status" id="wordle-status">${wordleStatus(d)}</div>

    <form id="wordle-form" class="wordle-form">
     <input id="wordle-answer" class="field" maxlength="5" minlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DEIN WORT" aria-label="Wort mit fünf Buchstaben" ${canPlay?'':'disabled'} required>
     <button class="btn btn-primary" type="submit" ${canPlay?'':'disabled'}>RATEN! ✨</button>
    </form>

    <p class="wordle-hint">🟩 Richtiger Platz &nbsp; 🟨 Im Wort enthalten &nbsp; ⬜ Nicht enthalten</p>
    <p class="small wordle-hint">Maximal 6 Versuche pro Spieler · 90 Sekunden pro Runde</p>
   </section>

   <aside class="panel wordle-sidebar">
    <div class="panel-title"><h3>👀 Alle Duelle</h3><span class="small">${all.length} Paarungen</span></div>
    <div class="wordle-duel-list" id="wordle-duels">
     ${all.map(x=>`<button type="button" class="wordle-duel ${x.id===d?.id?'active':''}" data-action="viewwordle" data-duel="${x.id}">
      <strong>#${x.id} ${esc(playerName(x.l))} vs. ${esc(playerName(x.s))}</strong>
      <span>${x.finished?(x.winner==='draw'?'🤝 Unentschieden':`🏆 Team ${x.winner}`):'🟢 Läuft noch'}</span>
     </button>`).join('')}
    </div>
    <div class="notice">Ist dein Duell beendet, kannst du hier andere Wortduelle beobachten.</div>
   </aside>
  </div>
 </main>`;

 document.getElementById('wordle-answer')?.focus();
 updateTimer();
}

function updateWordle(){
 const d=selectedWordleDuel();
 const own=ownWordleDuel();
 if(!d)return;

 const displayed=document.querySelector('.wordle-topline .pill');
 const selectedId=Number(displayed?.textContent?.match(/#(\d+)/)?.[1]);

 if(selectedId!==d.id){
  renderWordle();
  return;
 }

 for(const team of ['L','S']){
  const board=document.getElementById(`wordle-board-${team}`);
  if(!board)continue;

  const signature=JSON.stringify(d.guesses[team]);

  if(board.dataset.signature!==signature){
   board.dataset.signature=signature;
   board.innerHTML=wordleBoard(d.guesses[team]);
  }
 }

 const counter=document.querySelector('.wordle-topline .pill:nth-child(2)');
 if(counter)counter.textContent=`${room.game.duels.filter(x=>x.finished).length} / ${room.game.duels.length} BEENDET`;

 const status=document.getElementById('wordle-status');
 if(status)status.innerHTML=wordleStatus(d);

 const canPlay=room.status==='playing'&&own&&!own.finished&&own.id===d.id;

 const input=document.getElementById('wordle-answer');
 const button=document.querySelector('#wordle-form button');

 if(input)input.disabled=!canPlay;
 if(button)button.disabled=!canPlay;

 const list=document.getElementById('wordle-duels');
 if(list){
  const signature=JSON.stringify(room.game.duels.map(x=>[x.id,x.finished,x.winner]));

  if(list.dataset.signature!==signature){
   list.dataset.signature=signature;
   list.innerHTML=room.game.duels.map(x=>`
    <button type="button" class="wordle-duel ${x.id===d.id?'active':''}" data-action="viewwordle" data-duel="${x.id}">
     <strong>#${x.id} ${esc(playerName(x.l))} vs. ${esc(playerName(x.s))}</strong>
     <span>${x.finished?(x.winner==='draw'?'🤝 Unentschieden':`🏆 Team ${x.winner}`):'🟢 Läuft noch'}</span>
    </button>`).join('');
  }
 }

 updateTimer();
}

function renderMath(){
 const duels=room.game?.duels||[],d=duels.find(x=>x.l===myId||x.s===myId)||duels[0];
 const own=d&&(d.l===myId||d.s===myId);

 app.innerHTML=header()+`<main class="math-stage"><div class="section-head"><div><div class="eyebrow">KOPF AN KOPF · RUNDE ${room.round}</div><h1>MATHQUIZ <span class="gradient-text">BATTLE!</span></h1></div><span class="pill">⏱ <span id="timer">--:--</span></span></div>${scoreBar()}
 <div class="math-card"><div class="math-sticker">✎ schnell, schnell!</div>
 <div class="math-versus">${d?`<div class="math-opponent ${d.l===myId?'math-own':'math-rival'}">${avatarHTML(d.l,'math-portrait')}<b>${esc(playerName(d.l))}</b><strong data-math-score="L">${d.scores.L}</strong></div><span class="math-vs-text">GEGEN</span><div class="math-opponent ${d.s===myId?'math-own':'math-rival'}">${avatarHTML(d.s,'math-portrait')}<b>${esc(playerName(d.s))}</b><strong data-math-score="S">${d.scores.S}</strong></div>`:'Kein Duell'}</div>
 <div class="math-question" data-question-id="${d?d.questionId:0}">${d?esc(d.question.text):'?'} <span>= ?</span></div>
 <form id="math-form" class="math-form"><input id="math-answer" type="number" autocomplete="off" placeholder="Dein Ergebnis" ${own&&room.status==='playing'?'':'disabled'} required><button class="btn btn-primary" ${own&&room.status==='playing'?'':'disabled'}>ANTWORTEN!</button></form>
 <p class="math-rules">✔ Richtig: <b>+10 Punkte</b> · ✕ Falsch: <b>−5 Punkte</b> · Aufgabe bleibt bis zur Lösung gleich.</p>
 <p class="small">${own?'Du spielst dieses Duell.':'Du schaust diesem Duell zu.'}</p></div></main>`;

 document.getElementById('math-answer')?.focus();
 updateTimer();
}

function renderArenaGame(){
 const game=GAME_INFO[room.mode];

 app.innerHTML=header()+`<main><div class="section-head"><div><div class="eyebrow">LIVE · RUNDE ${room.round}/${room.rounds}</div><h1>${esc(game.name)} <span class="gradient-text">Arena</span></h1><div class="small">${esc(game.hint)}</div></div><span class="pill">⏱ <span id="timer">--:--</span></span></div>
 ${scoreBar()}<div class="game-layout"><section class="panel game-area arena-area"><div class="game-topline"><span class="small">${room.mode==='snake'?'✦ Lichtpunkte sammeln · andere Schlangen austricksen':'● Sammle Punkte · Friss kleinere Gegner'}</span><span class="pill">MAUS / WASD · LEERTASTE BOOST</span></div>
 <canvas id="arena" class="arena-canvas" width="900" height="540" aria-label="${esc(game.name)} Spielarena"></canvas><div class="small" style="margin-top:15px;text-align:center">Dein Team ist ${me()?.team||'Zuschauer'} · ${room.mode==='snake'?'Kollisionen sind tödlich!':'Wirst du gefressen, scheidest du für diese Runde aus.'}</div></section>
 <aside class="panel game-side"><div class="panel-title"><h3>🏅 Rangliste</h3><span class="small">LIVE</span></div><div class="leaderboard" id="leaders"></div><div class="notice" style="margin-top:17px">${room.mode==='snake'?'Lichtpunkte sammeln, Gegner abschneiden und wachsen.':'2 Punkte pro Pellet, 35 Punkte pro gefressenem Gegner.'}</div><p class="small" style="margin-top:18px">Steuerung: Maus oder <span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> oder Pfeiltasten. Leertaste: ${room.mode==='snake'?'Sprint':'Teilen / Sprint'}.</p></aside></div></main>`;

 drawArena();
 updateTimer();
 updateLeaders();
}

function updateLeaders(){
 const container=document.getElementById('leaders');
 if(!container||!room?.game)return;

 const actors=(room.mode==='snake'?room.game.snakes:room.game.cells).slice().sort((a,b)=>b.score-a.score).slice(0,12);

 if(!actors.length){
  if(!container.querySelector('.leader-row'))container.textContent='Noch keine Spieler.';
  return;
 }

 const current=[...container.querySelectorAll('.leader-row')].map(node=>node.dataset.actor);
 const keys=actors.map(actor=>actor.id);

 if(current.join('|')!==keys.join('|')){
  container.innerHTML=actors.map((a,i)=>`<div class="leader-row" data-actor="${a.id}"><span><span style="color:${a.team==='L'?'#aba2ff':'#ff9fc4'}">●</span> ${i+1}. ${avatarHTML(a.id,'leader-sticker')} ${esc(playerName(a.id))}${a.id===myId?' 💚':''}</span><b class="leader-points">${Math.floor(a.score)}</b></div>`).join('');
 }else{
  actors.forEach((a,i)=>{
   const score=container.children[i]?.querySelector('.leader-points');

   if(score&&score.textContent!==String(Math.floor(a.score))){
    score.textContent=String(Math.floor(a.score));
    score.classList.remove('reward-bump');
    void score.offsetWidth;
    score.classList.add('reward-bump');
   }
  });
 }
}

function paintArenaAvatar(ctx,id,x,y,size){
 const sticker=StarAvatar.imageFor(avatarOf(id));

 if(sticker.complete&&sticker.naturalWidth){
  ctx.drawImage(sticker,x-size/2,y-size/2,size,size);
 }else{
  ctx.fillStyle='#ffe9d0';
  ctx.beginPath();
  ctx.arc(x,y,size*.35,0,Math.PI*2);
  ctx.fill();
 }
}

function drawCartoonDeath(ctx,w,h){
 if(!deathState.active)return;

 const elapsed=performance.now()-deathState.startedAt;
 const progress=Math.min(1,elapsed/deathState.duration);
 const fadeIn=Math.min(1,elapsed/250);
 const fadeOut=Math.min(1,(deathState.duration-elapsed)/350);
 const opacity=Math.max(0,Math.min(fadeIn,fadeOut));

 ctx.save();
 ctx.globalAlpha=opacity;

 ctx.fillStyle='rgba(36,10,65,.78)';
 ctx.fillRect(0,0,w,h);

 const cx=w/2,cy=h/2;
 const burst=Math.min(1,elapsed/400);
 const scale=1+Math.sin(Math.min(1,elapsed/450)*Math.PI)*.16;

 for(const p of deathState.particles){
  const distance=p.speed*progress;
  const x=cx+Math.cos(p.angle)*distance;
  const y=cy+Math.sin(p.angle)*distance;

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(p.rotation+progress*4);
  ctx.globalAlpha=opacity*(1-progress*.7);
  ctx.fillStyle=p.color;

  if(p.type==='star'){
   ctx.beginPath();

   for(let i=0;i<10;i++){
    const a=i*Math.PI/5-Math.PI/2;
    const r=i%2===0?p.size:p.size*.45;
    const px=Math.cos(a)*r,py=Math.sin(a)*r;

    if(i===0)ctx.moveTo(px,py);
    else ctx.lineTo(px,py);
   }

   ctx.closePath();
   ctx.fill();
  }else{
   ctx.beginPath();
   ctx.arc(0,0,p.size*.65,0,Math.PI*2);
   ctx.fill();
  }

  ctx.restore();
 }

 ctx.translate(cx,cy-12);
 ctx.scale(scale*burst,scale*burst);

 ctx.textAlign='center';
 ctx.textBaseline='middle';
 ctx.lineJoin='round';

 ctx.font=`1000 ${Math.min(100,w*.15)}px "Trebuchet MS",sans-serif`;
 ctx.lineWidth=12;
 ctx.strokeStyle='#42105d';
 ctx.strokeText('K.O.!',0,-20);
 ctx.fillStyle='#ffe66d';
 ctx.fillText('K.O.!',0,-20);

 ctx.font=`900 ${Math.min(23,w*.04)}px "Trebuchet MS",sans-serif`;
 ctx.lineWidth=5;
 ctx.strokeStyle='#42105d';
 ctx.strokeText('Du bist ausgeschieden!',0,48);
 ctx.fillStyle='#ffffff';
 ctx.fillText('Du bist ausgeschieden!',0,48);

 ctx.font='700 15px "Trebuchet MS",sans-serif';
 ctx.fillStyle='#f4c9ff';
 ctx.fillText('Gleich geht es bei deinem Team weiter ...',0,86);

 ctx.restore();
}

function drawSpectatorHUD(ctx,w,h,target){
 if(!target||deathState.active)return;

 const player=room.players.find(p=>p.id===target.id);
 const name=player?.name||'Teammitglied';
 const label=`ZUSCHAUER  •  ${name}`;

 ctx.save();

 ctx.font='bold 13px "Trebuchet MS",sans-serif';
 const boxWidth=Math.min(w-24,Math.max(205,ctx.measureText(label).width+35));
 const x=12,y=12;

 ctx.fillStyle='rgba(57,19,91,.88)';
 ctx.strokeStyle='#d47adb';
 ctx.lineWidth=2;

 ctx.beginPath();
 ctx.roundRect(x,y,boxWidth,44,11);
 ctx.fill();
 ctx.stroke();

 ctx.fillStyle='#ffe66d';
 ctx.textAlign='left';
 ctx.textBaseline='middle';
 ctx.fillText(label,x+14,y+22,boxWidth-26);

 ctx.restore();
}

function drawArena(){
 const canvas=document.getElementById('arena');if(!canvas||!room?.game)return;
 const ctx=canvas.getContext('2d'),g=room.game,W=canvas.width,H=canvas.height;
 const sec=performance.now()/1000;
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#1d1b2b';ctx.fillRect(0,0,W,H);

 const actors=room.mode==='snake'?g.snakes:g.cells;
 const self=actors.find(p=>p.id===myId);

 updateDeathState(g);

 const cameraTarget=deathState.active&&self?self:getArenaSpectator(g);
 const spectating=!!cameraTarget&&cameraTarget.id!==myId;

 const zoom=room.mode==='snake'?.95:.86;
 const alpha=Math.min(1,(performance.now()-visualReceivedAt)/80);

 const previousActors=room.mode==='snake'?visualPrev?.snakes:visualPrev?.cells;
 const previousTarget=previousActors?.find(p=>p.id===cameraTarget?.id);

 const camX=cameraTarget
  ?previousTarget
   ?previousTarget.x+(cameraTarget.x-previousTarget.x)*alpha
   :cameraTarget.x
  :g.width/2;

 const camY=cameraTarget
  ?previousTarget
   ?previousTarget.y+(cameraTarget.y-previousTarget.y)*alpha
   :cameraTarget.y
  :g.height/2;

 const ox=W/2-camX*zoom,oy=H/2-camY*zoom;
 ctx.save();ctx.translate(ox,oy);ctx.scale(zoom,zoom);
 ctx.fillStyle='#242131';ctx.fillRect(0,0,g.width,g.height);
 ctx.strokeStyle='#ffffff0c';ctx.lineWidth=1;

 for(let x=0;x<g.width;x+=60){
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,g.height);ctx.stroke();
 }
 for(let y=0;y<g.height;y+=60){
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(g.width,y);ctx.stroke();
 }

 ctx.strokeStyle='#b69aba';ctx.lineWidth=7;ctx.strokeRect(3,3,g.width-6,g.height-6);

 if(room.mode==='snake'){
  for(const f of g.food){
   ctx.fillStyle=['#f7c76c','#b4f0e6','#f3b5d5'][Math.floor((f[0]+f[1])%3)];
   ctx.beginPath();
   ctx.arc(f[0],f[1],3.5+Math.sin(sec*4+f[0])*.5,0,Math.PI*2);
   ctx.fill();
  }

  for(const sn of g.snakes){
   if(!sn.alive)continue;

   const own=sn.id===myId,enemy=sn.team!==me()?.team;
   const color=own?'#8ef5a6':enemy?'#ee8a99':'#9ab9ed';
   const body=sn.body;

   if(body.length>1){
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='#161322';ctx.lineWidth=23;
    ctx.beginPath();ctx.moveTo(body[0][0],body[0][1]);
    for(let i=1;i<body.length;i++)ctx.lineTo(body[i][0],body[i][1]);
    ctx.stroke();

    ctx.strokeStyle=color;ctx.lineWidth=17;ctx.stroke();
    ctx.strokeStyle='#ffffff35';ctx.lineWidth=3;ctx.stroke();

    for(let i=6;i<body.length;i+=7){
     ctx.fillStyle='#ffffff66';
     ctx.beginPath();ctx.arc(body[i][0],body[i][1],3,0,Math.PI*2);ctx.fill();
    }
   }

   const old=visualPrev?.snakes?.find(p=>p.id===sn.id);
   const f=Math.min(1,(performance.now()-visualReceivedAt)/80);
   const x=old?old.x+(sn.x-old.x)*f:sn.x;
   const y=old?old.y+(sn.y-old.y)*f:sn.y;

   ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=own?'#42ff89':enemy?'#ff5267':'#bdd4ff';
   ctx.lineWidth=4;ctx.stroke();

   ctx.fillStyle='#fff';
   ctx.beginPath();
   ctx.arc(x+Math.cos(sn.angle-.55)*6,y+Math.sin(sn.angle-.55)*6,3,0,Math.PI*2);
   ctx.arc(x+Math.cos(sn.angle+.55)*6,y+Math.sin(sn.angle+.55)*6,3,0,Math.PI*2);
   ctx.fill();

   ctx.fillStyle='#171322';
   ctx.beginPath();
   ctx.arc(x+Math.cos(sn.angle-.55)*7,y+Math.sin(sn.angle-.55)*7,1.5,0,Math.PI*2);
   ctx.arc(x+Math.cos(sn.angle+.55)*7,y+Math.sin(sn.angle+.55)*7,1.5,0,Math.PI*2);
   ctx.fill();

   paintArenaAvatar(ctx,sn.id,x,y,29);
   ctx.font='bold 12px "Trebuchet MS"';
   ctx.fillStyle=own?'#70ffa5':'#fff';
   ctx.fillText(own?'▼ DU':playerName(sn.id).slice(0,12),x,y-38);
  }
 }else{
  for(const f of g.food){
   ctx.fillStyle=['#e4abdf','#f4d780','#94d8c8'][Math.floor((f.x+f.y)%3)];
   ctx.beginPath();ctx.arc(f.x,f.y,4,0,Math.PI*2);ctx.fill();
  }

  for(const pu of g.powerups||[]){
   ctx.fillStyle='#ffffff20';
   ctx.beginPath();ctx.arc(pu.x,pu.y,21+Math.sin(sec*5)*2,0,Math.PI*2);ctx.fill();
   ctx.font='25px "Segoe UI Emoji"';
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(pu.type==='boost'?'⚡':pu.type==='shield'?'🛡️':'✦',pu.x,pu.y);
  }

  for(const virus of g.viruses||[]){
   ctx.save();ctx.translate(virus.x,virus.y);
   ctx.fillStyle='#70c6a2';ctx.strokeStyle='#245d52';ctx.lineWidth=3;
   ctx.beginPath();
   for(let k=0;k<24;k++){
    const a=k*Math.PI/12,r=virus.r*(k%2?.82:1.1);
    if(k===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
    else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
   }
   ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  for(const c of [...g.cells].sort((a,b)=>a.r-b.r)){
   if(c.deadUntil>Date.now()+serverOffset)continue;

   const prev=visualPrev?.cells?.find(p=>p.id===c.id);
   const t=Math.min(1,(performance.now()-visualReceivedAt)/100);
   const x=prev?prev.x+(c.x-prev.x)*t:c.x;
   const y=prev?prev.y+(c.y-prev.y)*t:c.y;
   const own=c.id===myId,enemy=c.team!==me()?.team;

   ctx.beginPath();ctx.arc(x,y,c.r,0,Math.PI*2);
   ctx.fillStyle=c.team==='L'?'#637cb8':'#bb6a8e';ctx.fill();
   ctx.lineWidth=own?5:3;
   ctx.strokeStyle=own?'#57ff91':enemy?'#ff566e':'#d2c6ff';
   ctx.stroke();

   ctx.beginPath();ctx.arc(x-c.r*.2,y-c.r*.2,c.r*.6,0,Math.PI*2);
   ctx.fillStyle='#ffffff13';ctx.fill();

   if(c.shieldUntil>Date.now()+serverOffset){
    ctx.beginPath();ctx.arc(x,y,c.r+8,0,Math.PI*2);
    ctx.strokeStyle='#9ce9ff';ctx.stroke();
   }

   ctx.textAlign='center';ctx.textBaseline='middle';
   paintArenaAvatar(ctx,c.id,x,y,Math.min(67,Math.max(26,c.r*1.5)));
   ctx.fillStyle='#fff';ctx.font='bold 12px "Trebuchet MS"';
   ctx.fillText(playerName(c.id).slice(0,12),x,y+c.r+14);

   if(own){
    ctx.fillStyle='#70ff9c';
    ctx.fillText('▼ DU',x,y-c.r-14);
   }
  }
 }

 ctx.restore();

 if(room.status==='playing'){
  if(deathState.active){
   drawCartoonDeath(ctx,W,H);
  }else if(spectating){
   drawSpectatorHUD(ctx,W,H,cameraTarget);
  }
 }
}

function overlay(ctx,main,sub){
 ctx.fillStyle='#0a0e1bd0';ctx.fillRect(0,220,900,100);
 ctx.textAlign='center';ctx.fillStyle='#fff';
 ctx.font='bold 27px sans-serif';ctx.fillText(main,450,259);
 ctx.fillStyle='#bfc0d2';ctx.font='15px sans-serif';
 ctx.fillText(sub,450,292);
}

function updateFinalCountdown(){
 const existing=document.getElementById('final-countdown');
 if(!room||room.status!=='playing'||!room.deadline){existing?.remove();return;}

 const remaining=Math.ceil((room.deadline-(Date.now()+serverOffset))/1000);
 if(remaining>10||remaining<=0){existing?.remove();return;}

 let el=existing;
 if(!el){
  el=document.createElement('div');
  el.id='final-countdown';
  el.className='final-countdown';
  document.body.appendChild(el);
 }

 if(el.dataset.second!==String(remaining)){
  el.dataset.second=String(remaining);
  el.innerHTML=`<span>LETZTE SEKUNDEN</span><strong>${remaining}</strong>`;
  el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
 }
}

function updateTimer(){
 const el=document.getElementById('timer');if(!el||!room?.deadline)return;
 const remaining=Math.max(0,Math.ceil((room.deadline-(Date.now()+serverOffset))/1000));
 updateFinalCountdown();
 el.textContent=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
}

function renderResults(){
 const done=room.status==='finished';
 const result=room.result;
 const winner=done?(room.scores.L===room.scores.S?'draw':room.scores.L>room.scores.S?'L':'S'):result.winner;
 const winnerText=winner==='draw'?'UNENTSCHIEDEN':`TEAM ${winner} GEWINNT!`;
 const label=done?'MATCH BEENDET':'RUNDE BEENDET';
 const gains=done?room.scores:result.gains;

 app.innerHTML=header()+`<main>${scoreBar()}<div class="panel result-center"><div class="eyebrow">${label}</div><div class="winner-icon">${winner==='draw'?'🤝':'🏆'}</div><h1 class="result-title ${winner==='L'?'mark-L':winner==='S'?'mark-S':''}">${winnerText}</h1>
 <p class="result-sub">${done?'Das Match ist vorbei! Die Team-Gesamtpunkte entscheiden über den Sieg.':`Runde ${room.round} von ${room.rounds} abgeschlossen. ${esc(result.summary)}`}</p>
 <div class="result-points"><div class="result-score"><div class="mark-L">TEAM L</div><strong class="mark-L">${gains.L}</strong><div class="small">${done?'Gesamtpunkte':'Punkte in der Runde'}</div></div>
 <div class="result-score"><div class="mark-S">TEAM S</div><strong class="mark-S">${gains.S}</strong><div class="small">${done?'Gesamtpunkte':'Punkte in der Runde'}</div></div></div>
 ${done?(isHost()?'<button class="btn btn-primary" data-action="back">↻ Neue Spielserie</button>':'<div class="notice green">Spielserie beendet.</div>'):'<div class="notice green">⏳ Nächste Runde startet automatisch in <strong id="next-round-timer">10</strong> Sekunden.</div>'}
 <div class="result-mascot-row" aria-hidden="true"><span>✦</span>${(room.players||[]).filter(p=>p.team).slice(0,8).map(p=>avatarHTML(p.id,'result-sticker')).join('')}<span>✧</span></div><div class="history">${room.history.map((h,i)=>`<span>Runde ${i+1} · ${esc(GAME_INFO[h.mode]?.name||h.mode)} · ${h.winner==='draw'?'Remis':'Team '+h.winner}</span>`).join('')}</div>
 </div></main>`;
}

function render(){
 if(!room)renderHome();
 else if(room.status==='briefing')renderBriefing();
 else if(room.status==='preview')renderPreview();
 else if(room.status==='lobby')renderLobby();
 else if(room.status==='playing'&&room.mode==='mathquiz')renderMath();
 else if(room.status==='playing'&&room.mode==='wordle')renderWordle();
 else if(room.status==='playing'&&['tictactoe','connect4'].includes(room.mode))renderDuelGame();
 else if(room.status==='playing')renderArenaGame();
 else renderResults();
}

app.addEventListener('pointerdown',()=>StarSound.userGesture(),{passive:true});

app.addEventListener('submit',e=>{
 if(e.target.id==='math-form'){
  e.preventDefault();

  const d=room.game?.duels.find(x=>x.l===myId||x.s===myId);
  const input=document.getElementById('math-answer');

  if(d&&input?.value!==''){
   send('mathanswer',{duel:d.id,answer:Number(input.value),questionId:d.questionId});
   input.value='';
  }
  return;
 }

 if(e.target.id==='wordle-form'){
  e.preventDefault();

  const d=ownWordleDuel();
  const input=document.getElementById('wordle-answer');
  if(!d||d.finished||!input)return;

  const word=input.value.trim().toUpperCase().replace(/[^A-Z]/g,'');

  if(word.length!==5){
   say('Bitte gib genau fünf Buchstaben ein.');
   return;
  }

  send('wordguess',{duel:d.id,word});
  input.value='';
  input.focus();
 }
});

app.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action]');if(!button)return;
 const action=button.dataset.action;

 if(action==='sound'||action==='music'){
  if(action==='sound')StarSound.toggleSound();else StarSound.toggleMusic();
  document.querySelectorAll('[data-action="sound"]').forEach(el=>el.textContent=StarSound.enabled?'🔊 Ton AN':'🔇 Ton AUS');
  document.querySelectorAll('[data-action="music"]').forEach(el=>el.textContent=StarSound.musicOn?'♫ Musik AN':'♫ Musik AUS');
  return;
 }

 if(action==='color'||action==='accessory'){
  const key=action==='color'?'me-color':'me-accessory';
  const value=action==='color'?button.dataset.color:button.dataset.accessory;
  try{localStorage.setItem(key,value)}catch{}
  send('customize',{pet:getPet(),color:getColor(),accessory:getAccessory()});
  refreshAppearance();playEffect('tap');return;
 }

 if(action==='pet'){
  try{localStorage.setItem('mir-egal-pet',button.dataset.pet)}catch{}
  send('customize',{pet:button.dataset.pet,color:getColor(),accessory:getAccessory()});

  document.querySelectorAll('.pet-option').forEach(el=>{
   const selected=el.dataset.pet===button.dataset.pet;
   el.classList.toggle('selected',selected);
   el.setAttribute('aria-pressed',String(selected));
  });

  refreshAppearance();playEffect('tap');return;
 }

 if(action==='create'||action==='join'){
  const name=getName();saveName(name);

  if(action==='join'){
   const code=document.getElementById('joincode')?.value.toUpperCase().trim().replace(/\s/g,'');
   if(!code||code.length!==6){
    say('Bitte gib einen sechsstelligen Lobby-Code ein.');
    return;
   }

   connectAnd('join',{name,code,pet:getPet(),color:getColor(),accessory:getAccessory()});
  }else{
   connectAnd('create',{name,pet:getPet(),color:getColor(),accessory:getAccessory()});
  }
 }

 if(action==='leave')send('leave');
 if(action==='addbot')send('addbot',{team:button.dataset.team});
 if(action==='removebot')send('removebot',{id:button.dataset.id});
 if(action==='team')send('team',{team:button.dataset.team});
 if(action==='ready')send('ready');
 if(action==='start')send('start');
 if(action==='next')send('next');
 if(action==='back')send('back');

 if(action==='viewduel'){
  chosenDuel=Number(button.dataset.duel);
  renderDuelGame();
 }

 if(action==='viewwordle'){
  const own=ownWordleDuel();

  if(own&&!own.finished&&Number(button.dataset.duel)!==own.id){
   say('Beende zuerst dein eigenes Duell.');
   return;
  }

  chosenDuel=Number(button.dataset.duel);
  renderWordle();
 }

 if(action==='move'){
  send('move',{
   duel:Number(button.dataset.duel),
   row:Number(button.dataset.row||0),
   col:Number(button.dataset.col)
  });
 }

 if(action==='copycode'||action==='copylink'){
  const value=action==='copycode'?room.code:`${location.origin}/?room=${encodeURIComponent(room.code)}`;

  try{
   await navigator.clipboard.writeText(value);
   say('✓ In die Zwischenablage kopiert!');
  }catch{
   say('Kopieren nicht möglich. Code: '+room.code);
  }
 }
});

app.addEventListener('change',e=>{
 const target=e.target;
 if(!room||room.status!=='lobby'||!isHost())return;

 if(target.classList.contains('mode-checkbox')||target.id==='rounds'){
  const games=[...document.querySelectorAll('.mode-checkbox:checked')].map(i=>i.value);

  if(!games.length){
   target.checked=true;
   say('Mindestens ein Minigame muss aktiviert bleiben.');
   return;
  }

  send('options',{
   games,
   rounds:Number(document.getElementById('rounds')?.value||5)
  });
 }
});

app.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&!room){
  const name=getName();saveName(name);
  const code=document.getElementById('joincode')?.value.trim().toUpperCase();

  if(code?.length===6){
   connectAnd('join',{name,code,pet:getPet(),color:getColor(),accessory:getAccessory()});
  }else{
   connectAnd('create',{name,pet:getPet(),color:getColor(),accessory:getAccessory()});
  }
 }
});

const KEY_MAP={
 w:[0,-1],ArrowUp:[0,-1],
 s:[0,1],ArrowDown:[0,1],
 a:[-1,0],ArrowLeft:[-1,0],
 d:[1,0],ArrowRight:[1,0]
};

window.addEventListener('keydown',e=>{
 if(!room||room.status!=='playing'||!['snake','cellwars'].includes(room.mode))return;
 if(getArenaSpectator(room.game)?.id!==myId)return;
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;

 if(KEY_MAP[e.key]||e.key===' '){
  e.preventDefault();
  keys.add(e.key);
  if(e.key===' '&&room.mode==='cellwars')splitRequested=true;
 }
});

window.addEventListener('keyup',e=>{
 if(KEY_MAP[e.key]||e.key===' '){
  keys.delete(e.key);
  if(room?.mode==='cellwars')sendCellDirection();
 }
});

window.addEventListener('pointermove',e=>{
 if(room?.status!=='playing'||!['snake','cellwars'].includes(room.mode))return;

 const canvas=document.getElementById('arena');
 if(!canvas)return;

 const r=canvas.getBoundingClientRect();
 const x=e.clientX-(r.left+r.width/2);
 const y=e.clientY-(r.top+r.height/2);
 const len=Math.hypot(x,y);

 if(len>12)mouseDirection={dx:x/len,dy:y/len};
});

window.addEventListener('blur',()=>{
 keys.clear();
 if(room?.mode==='cellwars')send('input',{dx:0,dy:0});
});

function direction(){
 let x=0,y=0;

 for(const key of keys){
  const d=KEY_MAP[key];
  if(d){x+=d[0];y+=d[1];}
 }

 x=Math.sign(x);y=Math.sign(y);
 return {dx:x,dy:y};
}

function sendCellDirection(){
 const {dx,dy}=direction();
 send('input',{dx,dy});
}

function animationLoop(now){
 if(['playing','preview'].includes(room?.status)&&['snake','cellwars'].includes(room.mode)&&now-lastFrame>=16){
  drawArena();
  lastFrame=now;

  if(now-lastLeaders>350){
   updateLeaders();
   lastLeaders=now;
  }
 }

 requestAnimationFrame(animationLoop);
}

requestAnimationFrame(animationLoop);

setInterval(()=>{
 if(room?.status==='briefing')updateBriefing();
 if(room?.status==='preview')updatePreview();

 if(room?.status==='results'){
  const el=document.getElementById('next-round-timer');

  if(el){
   el.textContent=String(Math.max(0,Math.ceil((room.resultsEnd-(Date.now()+serverOffset))/1000)));
  }
 }

 updateTimer();

 if(room?.status!=='playing'){
  document.getElementById('final-countdown')?.remove();
 }

 if(!room||room.status!=='playing'||!['snake','cellwars'].includes(room.mode))return;

 const actors=room.mode==='snake'?room.game?.snakes:room.game?.cells;
 const self=actors?.find(p=>p.id===myId);
 const alive=arenaAlive(self,room.mode,Date.now()+serverOffset);

 if(!alive){
  keys.clear();
  mouseDirection=null;
  splitRequested=false;
  lastInput='';
  return;
 }

 const keyboard=direction();
 const dir=keyboard.dx||keyboard.dy?keyboard:mouseDirection||{dx:0,dy:0};
 const {dx,dy}=dir;

 const stamp=`${dx.toFixed(2)}:${dy.toFixed(2)}:${keys.has(' ')?1:0}:${splitRequested?1:0}`;
 const now=performance.now();

 if(stamp===lastInput&&now-lastInputAt<220)return;

 lastInput=stamp;
 lastInputAt=now;

 if(room.mode==='snake'){
  if(Math.hypot(dx,dy)>.05){
   send('input',{dx,dy,boost:keys.has(' ')});
  }
 }else{
  send('input',{dx,dy,split:splitRequested});
  splitRequested=false;
 }
},85);

render();
