
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;

function edit(file,fn){
 const full=path.join(root,file);
 if(!fs.existsSync(full))throw Error('Datei fehlt: '+file);
 const before=fs.readFileSync(full,'utf8');
 const after=fn(before.replace(/\r\n/g,'\n'));
 if(after===before)return;
 fs.writeFileSync(full+'.bak',before);
 fs.writeFileSync(full,after);
 console.log('Fertig:',file);
}

function swap(text,pairs){
 for(const [oldValue,newValue] of pairs){
  if(!text.includes(oldValue))throw Error('Text fehlt: '+oldValue.slice(0,65));
  text=text.split(oldValue).join(newValue);
 }
 return text;
}

const words=[
 ['<div class="logo">✦</div>','<div class="logo">M</div>'],
 ['✧ STERNENSTAUB ✧','STERNENSTAUB'],
 ['🔊 Ton AN','Ton an'],
 ['🔇 Ton AUS','Ton aus'],
 ['♫ Musik AN','Musik an'],
 ['♫ Musik AUS','Musik aus'],
 ['<span class="dot"></span> Multiplayer online','<span class="dot"></span>Online'],
 ['✕ Verlassen','Verlassen'],
 ['<span class="gradient-text">MIR EGAL<br>Das offizielle Discord Sternenstaub Spiel</span>','MIR <span class="gradient-text">EGAL.</span><span class="title-kicker">STERNENSTAUB</span>'],
 ['Der Große Kampf zwischen Team Lara und Team Soul 🌠','Lara gegen Soul. Sechs Spiele, ein Sieger.'],
 ['<span class="feature">Entwickler: FelixFries</span>',''],
 ['<div class="eyebrow">DEIN STERNENWESEN</div>','<div class="eyebrow">PROFIL</div>'],
 ['<h3>Avatareditor</h3>','<h3>Dein Avatar</h3>'],
 ['DEIN STERNENWESEN\n     <span class="pet-hint">(lokal auf deinem Gerät)</span>','Tier wählen'],
 ['<strong>Deine Tiergruppe</strong>','<strong>Dein Avatar</strong>'],
 ['<div class="eyebrow">✦ STERNENSTAUB</div>','<div class="eyebrow">SPIELE</div>'],
 ['Kopf an Kopf','Drei in einer Reihe'],
 ['Strategie gewinnt','Vier in einer Reihe'],
 ['Slither Stars','Schlangenkreuzung'],
 ['Überlebe die Arena','Sammeln und überleben'],
 ['Agar Arena','Fresskampf'],
 ['Werde zur größten Zelle','Wachsen und fressen'],
 ['Wer rechnet schneller?','Rechne schneller'],
 ['Errate das Wort zuerst!','Fünf Buchstaben'],
 ['<div class="eyebrow">LOS GEHT\'S</div>','<div class="eyebrow">MULTIPLAYER</div>'],
 ['Bereit für ein Match?','Lobby starten'],
 ['DEIN SPIELERNAME','Spielername'],
 ['✦ Neue Lobby erstellen','Lobby erstellen'],
 ['ODER EINER LOBBY BEITRETEN','ODER BEITRETEN'],
 ['LOBBY-CODE','Lobby-Code'],
 ['Beitreten →','Beitreten'],
 ['💡 Freunde können mit dem Lobby-Code oder einem Einladungslink\n     beitreten. Der Host muss den Spielserver erreichbar machen.','Teile den Lobby-Code mit deinen Freunden.'],
 ['🌠 STERNENSTAUB 🌠 · MIR EGAL','STERNENSTAUB · von FelixFries'],
 ['Noch niemand in diesem Team.<br>Sei der Erste!','Noch frei.'],
 ['WARTERAUM · ${room.players.length}/20 SPIELER','LOBBY · ${room.players.length}/20'],
 ['Deine Lobby <span class="gradient-text">','Lobby <span class="gradient-text">'],
 [' Wähle ein Team und mach dich bereit.',' Wähle ein Team.'],
 ['⧉ Code kopieren','Code kopieren'],
 ['↗ Einladungslink','Einladungslink'],
 ['<strong>Dein Sternenwesen</strong>','<strong>Dein Avatar</strong>'],
 [' · Charakterfarbe und Accessoire kannst du im Startmenü ändern.',' · Bearbeiten im Startmenü.'],
 ['🎮 Minigame-Auswahl','Spiele auswählen'],
 ['Runden pro Match','Runden'],
 ['🚀 Match starten','Match'],
 ['Mindestens <strong>1 Spieler pro Team</strong>, höchstens <strong>1 Spieler Unterschied</strong>. Maximal 10 je Team. Nicht zugeteilte Spieler können zuschauen.','Mindestens 1 Spieler pro Team. Maximal 1 Spieler Unterschied.'],
 ['✓ Bereit – zurücknehmen','Bereit zurücknehmen'],
 ['○ Als bereit markieren','Bereit melden'],
 ['⚡ MATCH STARTEN','Match starten'],
 ['⏳ Der Host startet das Match.','Warte auf den Start.'],
 ['<div class="small">TEAM L</div>','<div class="small">LARA</div>'],
 ['<div class="small">TEAM S</div>','<div class="small">SOUL</div>'],
 ['✨ Du bist am Zug!','Du bist dran.'],
 ['⏳ Dein Gegner ist am Zug.','Gegner ist dran.'],
 ['<div class="briefing-sparkles">✦ ✧ ✨ ✦ ✧</div>',''],
 [' · DAS NÄCHSTE MINIGAME',' · NÄCHSTES SPIEL'],
 ['Team L ⚔️ Team S · Viel Glück, Sternenwesen!','Lara gegen Soul'],
 ['Erklärung · noch ${Math.ceil(left)} Sekunden','Start in ${Math.ceil(left)} s'],
 ['Schau dich schon mal um. Noch nicht bewegen!','Bereit?'],
 ['⚡ Errate das Wort schneller als dein Gegner!','Finde das Wort vor deinem Gegner.'],
 ['WORDLE <span class="gradient-text">BATTLE!</span>','Wordle <span class="gradient-text">Battle</span>'],
 ['Dasselbe Wort für beide Spieler · Wer zuerst richtig liegt, gewinnt 100 Punkte.','Ein Wort. Zwei Spieler. 100 Punkte für den Sieg.'],
 ['RATEN! ✨','Raten'],
 ['🟩 Richtiger Platz &nbsp; 🟨 Im Wort enthalten &nbsp; ⬜ Nicht enthalten','Grün: richtig · Gelb: falscher Platz · Grau: nicht im Wort'],
 ['Maximal 6 Versuche pro Spieler · 90 Sekunden pro Runde','6 Versuche · 90 Sekunden'],
 ['👀 Alle Duelle','Andere Duelle'],
 ['MATHQUIZ <span class="gradient-text">BATTLE!</span>','Mathe<span class="gradient-text">quiz</span>'],
 ['✎ schnell, schnell!','Kopfrechnen'],
 ['ANTWORTEN!','Antworten'],
 ['✔ Richtig: <b>+10 Punkte</b> · ✕ Falsch: <b>−5 Punkte</b> · Aufgabe bleibt bis zur Lösung gleich.','Richtig +10 · Falsch −5'],
 ['MAUS / WASD · LEERTASTE BOOST',"Maus / WASD · Leertaste: ${room.mode==='snake'?'Sprint':'Teilen'}"],
 ['🏅 Rangliste','Rangliste'],
 ['Du bist ausgeschieden!','Ausgeschieden'],
 ['Gleich geht es bei deinem Team weiter ...','Du schaust deinem Team zu.'],
 ['LETZTE SEKUNDEN','Endspurt'],
 ['UNENTSCHIEDEN','Unentschieden'],
 ['TEAM ${winner} GEWINNT!','Team ${teamName(winner)} gewinnt'],
 ['Das Match ist vorbei! Die Team-Gesamtpunkte entscheiden über den Sieg.','Endstand.'],
 ['Runde ${room.round} von ${room.rounds} abgeschlossen. ${esc(result.summary)}','${esc(result.summary)}'],
 ['👀 Du schaust diesem Wortduell zu.','Du schaust zu.'],
 ['👀 Dein Duell ist vorbei. Du schaust einem anderen Duell zu.','Dein Duell ist vorbei. Du schaust zu.'],
 ['↻ Neue Spielserie','Neues Match'],
 ['Spielserie beendet.','Match beendet.'],
 ['⏳ Nächste Runde startet automatisch in <strong id="next-round-timer">10</strong> Sekunden.','Weiter in <strong id="next-round-timer">10</strong> s'],
 ['✓ In die Zwischenablage kopiert!','Kopiert.'],
 ['Server nicht erreichbar. Ist START_MIR_EGAL.bat gestartet?','Server nicht erreichbar. Versuch es gleich noch mal.'],
 ['<h4>Mathquiz</h4>','<h4>Mathequiz</h4>'],
 ['<div><span>TEAM L</span>','<div><span>TEAM LARA</span>'],
 ['<div><span>TEAM S</span>','<div><span>TEAM SOUL</span>'],
 ['<div class="mark-L">TEAM L</div>','<div class="mark-L">LARA</div>'],
 ['<div class="mark-S">TEAM S</div>','<div class="mark-S">SOUL</div>']
];

const info=`const GAME_INFO = {
 tictactoe:{name:'Tic-Tac-Toe',icon:'',short:'Drei in einer Reihe',hint:'Drei in einer Reihe gewinnen. 24 Sekunden pro Zug.'},
 connect4:{name:'4 Gewinnt',icon:'',short:'Vier in einer Reihe',hint:'Vier Steine in einer Reihe gewinnen. 24 Sekunden pro Zug.'},
 snake:{name:'Schlangenkreuzung',icon:'',short:'Sammeln und überleben',hint:'Sammle Punkte und weiche anderen aus. WASD oder Pfeiltasten.'},
 mathquiz:{name:'Mathequiz',icon:'',short:'Schnell rechnen',hint:'Richtig +10, falsch −5. Rechne schneller als dein Gegner.'},
 cellwars:{name:'Fresskampf',icon:'',short:'Wachsen und fressen',hint:'Sammle Punkte und friss kleinere Zellen.'},
 wordle:{name:'Wordle Battle',icon:'',short:'Fünf Buchstaben',hint:'Ein Wort, sechs Versuche. Wer zuerst richtig liegt, gewinnt.'}
};`;

const descriptions=`const gameDescriptions={
 tictactoe:'Drei in einer Reihe gewinnen. 24 Sekunden pro Zug.',
 connect4:'Vier Steine in einer Reihe gewinnen. 24 Sekunden pro Zug.',
 snake:'Sammle Lichtpunkte. Weiche Wänden und anderen Schlangen aus.',
 mathquiz:'Rechne schneller als dein Gegner. Richtig +10, falsch −5.',
 cellwars:'Sammle Punkte und friss kleinere Zellen.',
 wordle:'Finde das Wort vor deinem Gegner. Sechs Versuche, 90 Sekunden.'
};`;

edit('public/app.js',app=>{
 if(app.includes('const teamName=t=>'))return app;

 app=swap(app,words);

 app=app.replace(
  'const isHost=()=>room?.hostId===myId;\nconst getName=',
  "const isHost=()=>room?.hostId===myId;\nconst teamName=t=>t==='L'?'Lara':t==='S'?'Soul':'–';\nconst getName="
 );

 app=app.replace(/const GAME_INFO = \{[\s\S]*?\n\};/,info);
 app=app.replace(/const gameDescriptions=\{[\s\S]*?\n\};/,descriptions);

 app=app.replace(
  "room.status==='playing'&&own&&!own.finished&&d?.id===own.id",
  "room.status==='playing'&&own&&!own.finished&&d?.id===own.id&&(own.guesses?.[me()?.team]?.length||0)<6"
 );

 app=app.replace(
  "room.status==='playing'&&own&&!own.finished&&own.id===d.id",
  "room.status==='playing'&&own&&!own.finished&&own.id===d.id&&(own.guesses?.[me()?.team]?.length||0)<6"
 );

 app=app.replace(
  "if(own?.id===d.id)return 'Finde das Wort vor deinem Gegner.';",
  "if(own?.id===d.id)return (own.guesses?.[me()?.team]?.length||0)>=6?'Keine Versuche mehr. Warte auf den Gegner.':'Finde das Wort vor deinem Gegner.';"
 );

 return app;
});

edit('server.js',server=>{
 if(server.includes("summary='Mathepunkte aller Teammitglieder'"))return server;

 server=swap(server,[
  [
   "}else if(mode==='snake'){\n for(const s of g.snakes){",
   "}else if(mode==='mathquiz'){\n for(const d of g.duels){gains.L+=d.scores.L;gains.S+=d.scores.S;}\n summary='Mathepunkte aller Teammitglieder';\n}else if(mode==='snake'){\n for(const s of g.snakes){"
  ],
  [
   "    }else if(room.mode==='snake'){\n      const snake=room.game.snakes.find(s=>s.id===player.id);",
   "    }else if(room.mode==='wordle'){\n      for(const d of room.game.duels){if(!d.finished&&(d.l===player.id||d.s===player.id)){d.finished=true;d.winner=d.l===player.id?'S':'L';d.finishedAt=Date.now();}}\n      if(room.game.duels.every(d=>d.finished))finishGame(room);\n    }else if(room.mode==='snake'){\n      const snake=room.game.snakes.find(s=>s.id===player.id);"
  ]
 ]);

 return server;
});

const css=String.raw`
/* FINAL POLISH */
body,body:has(.home-new){background:radial-gradient(circle at 12% 8%,#b85fc766,transparent 32%),radial-gradient(circle at 88% 90%,#744dc466,transparent 38%),linear-gradient(135deg,#6b2996,#9039ab 55%,#642b95);background-attachment:fixed}
body:before{opacity:.08!important}.starfield{display:none!important}
.topbar{background:#522678d9;border:1px solid #b483cb;border-radius:15px;box-shadow:0 10px 28px #270d4255;transform:none}.logo{background:linear-gradient(135deg,#ffe0a4,#ffacd0);color:#40205e;border:0;box-shadow:none;animation:none;transform:none}
.title,.home-intro .title{color:#fff;text-shadow:none;transform:none;animation:none;font-size:clamp(40px,6vw,76px);line-height:1.05}
.gradient-text,.home-intro .gradient-text{background:linear-gradient(110deg,#ffe2a1,#ff9fc9 50%,#c9b3ff)!important;background-clip:text!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}
.title-kicker{display:block;font-size:clamp(13px,1.7vw,20px);font-weight:900;letter-spacing:.35em;margin-top:10px;color:#f6d8ff}
.home-intro .sub{font-size:15px;line-height:1.5}.home-new .home-box,.home-games,body:not(:has(.home-new)) .panel{background:linear-gradient(155deg,#8138a8,#622a90);border:1px solid #b788d0;border-radius:16px;box-shadow:0 13px 30px #2c0e4b55;transform:none}
.home-new .home-box,.home-games{min-height:0}.home-new .eyebrow,.eyebrow{color:#fbd4e8;text-shadow:none;letter-spacing:1px}
.home-games .preview-tile,.home-games .preview-tile:nth-child(n){background:#60308b;border:1px solid #bb94d3;border-radius:11px;box-shadow:none;transform:none!important;grid-column:auto;min-height:100px}.home-games .preview-tile:nth-child(2),.home-games .preview-tile:nth-child(5){background:#8d428c}.home-games .preview-tile:nth-child(3),.home-games .preview-tile:nth-child(6){background:#35668e}
.home-games .preview-visual{font-size:22px;animation:none}.home-games .preview-tile:hover{transform:translateY(-3px)!important;box-shadow:0 8px 20px #290c4766}
.btn,.join-team,.bot-add{border:1px solid #bc91d0!important;border-radius:10px!important;box-shadow:none!important;text-transform:none;font-weight:800}.btn:hover:not(:disabled),.join-team:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 7px 17px #300e4a66!important}
.btn-primary,.home-new .btn-primary{background:linear-gradient(110deg,#ffe2ad,#ffc3d8);border-color:#ffe6c9!important;color:#48225f!important;box-shadow:none!important}.btn-secondary,.home-new .btn-secondary{background:linear-gradient(110deg,#78449a,#9b5bb1);color:#fff!important}
.field,.home-new .field{background:#fff2fb;color:#382047;border:1px solid #d5b2df;border-radius:10px}.field:focus,.home-new .field:focus{border-color:#ffe1a4;box-shadow:0 0 0 3px #ffe0b344}
.section-head{background:#642e8a99;border:1px solid #b485c7;border-radius:15px}.section-head h1,.panel-title h3{text-shadow:none}.section-head .small{color:#f4d7f6}
.character-spotlight,.lobby-profile{transform:none;border-style:solid;background:#66358d}.team-header.L{background:linear-gradient(110deg,#2587a9,#2aabd0)}.team-header.S{background:linear-gradient(110deg,#b5337d,#e459a1)}
.scoreboard{background:linear-gradient(110deg,#582b88,#843ca2,#8f3c8c);border:1px solid #bb85d0;border-radius:16px;box-shadow:0 9px 22px #2a0c4766}.score-value,.score-mid strong{text-shadow:none}
.game-area{background:linear-gradient(145deg,#6d3795,#50287c)!important}.math-card{background:linear-gradient(145deg,#8242aa,#572b84)!important;border:1px solid #ba8ad1!important;border-radius:18px!important;box-shadow:0 12px 30px #2a0d4766!important;transform:none}.math-question{border:1px solid #d0a2e0;text-shadow:none}
.briefing-card{background:linear-gradient(145deg,#8b47b2,#572b85)!important;border:1px solid #c494d8!important;border-radius:20px!important;box-shadow:0 12px 32px #290e4b66!important;transform:none}.briefing-card h1,.result-title{text-shadow:none}.briefing-sparkles,.prestart-sub{display:none}
.wordle-status{background:#522b72;border:1px solid #c28dd4;color:#fff;font-size:14px}.wordle-hint{color:#f5dff7}.wordle-player{box-shadow:none}.wordle-tile{box-shadow:none}
.result-score{box-shadow:none;border-width:1px}.winner-icon{display:none}.history span{font-weight:600}.notice{font-weight:500}.footer{color:#ead1f3}
@media(max-width:1100px){.home-content{grid-template-columns:repeat(2,minmax(0,1fr))}.home-lobby{grid-column:1/-1}}
@media(max-width:700px){.home-content{grid-template-columns:1fr}.home-lobby{grid-column:auto}.home-intro .title{font-size:clamp(38px,9vw,56px)}}
@media(prefers-reduced-motion:reduce){.home-games .preview-tile,.btn{transition:none!important;animation:none!important}}
`;

edit('public/style.css',style=>
 style.includes('/* FINAL POLISH */')?style:style+'\n'+css
);

console.log('Finalisierung abgeschlossen.');
