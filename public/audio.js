'use strict';
// Original, code-generated sound effects and a soft original eight-note loop.
// Web Audio needs an explicit click before it can play; all controls are optional.
window.StarSound=(()=>{
  let ctx=null, musicTimer=null, scheduleUntil=0;
  const setting=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
  const save=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  let enabled=setting('me-audio')==='on';
  let musicOn=setting('me-music')!=='off';
  let lastScoreSound=0;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  function init(){
    if(!AudioContextClass)return false;
    try { if(!ctx)ctx=new AudioContextClass();if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true; }
    catch {return false;}
  }
  function tone(freq,at,duration,volume=0.02,type='sine',bend=1){
    if(!ctx||ctx.state!=='running')return;
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(freq,at);
    if(bend!==1)oscillator.frequency.exponentialRampToValueAtTime(Math.max(40,freq*bend),at+duration);
    gain.gain.setValueAtTime(0.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain).connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration+.015);
  }
  function play(effect){
    if(!enabled||!ctx||ctx.state!=='running')return;
    const t=ctx.currentTime+.005;
    if(effect==='correct'){tone(523,t,.12,.045,'triangle');tone(659,t+.09,.12,.035,'triangle');tone(880,t+.18,.23,.032,'sine');}
    else if(effect==='wrong'){tone(290,t,.13,.029,'sawtooth',.67);tone(215,t+.12,.14,.023,'triangle',.75);}
    else if(effect==='tap'){tone(480,t,.075,.016,'triangle',1.22);}
    else if(effect==='score'){
      if(performance.now()-lastScoreSound<230)return;
      lastScoreSound=performance.now();tone(720,t,.075,.013,'sine',1.23);tone(980,t+.065,.11,.011,'sine');
    }
    else if(effect==='count'){tone(480,t,.095,.026,'square');}
    else if(effect==='start'){tone(440,t,.16,.03,'triangle');tone(660,t+.10,.16,.03,'triangle');tone(880,t+.22,.25,.03,'triangle');}
    else if(effect==='win'){[523,659,784,1046].forEach((f,i)=>tone(f,t+i*.13,.28,.024,'triangle'));}
  }
  function scheduleMusic(){
    if(!enabled||!musicOn||!ctx||ctx.state!=='running')return;
    const start=Math.max(ctx.currentTime+.08,scheduleUntil);
    const notes=[392,523,587,523,440,392,349,392]; // Composed for this prototype
    const bass=[196,174.61,220,174.61];
    notes.forEach((f,i)=>tone(f,start+i*.42,.26,.007,'sine'));
    bass.forEach((f,i)=>tone(f,start+i*.84,.55,.004,'triangle'));
    scheduleUntil=start+notes.length*.42;
  }
  function sync(){
    if(enabled&&init()){
      if(musicOn&&!musicTimer){scheduleUntil=0;scheduleMusic();musicTimer=setInterval(scheduleMusic,2650);}
      if(!musicOn&&musicTimer){clearInterval(musicTimer);musicTimer=null;}
    }else if(musicTimer){clearInterval(musicTimer);musicTimer=null;}
  }
  return {
    get enabled(){return enabled},get musicOn(){return musicOn},
    toggleSound(){enabled=!enabled;save('me-audio',enabled?'on':'off');sync();if(enabled)play('start');return enabled;},
    toggleMusic(){musicOn=!musicOn;save('me-music',musicOn?'on':'off');sync();return musicOn;},
    play,
    // Avoid automatic playback until a user gesture, even if an old preference exists.
    userGesture(){if(enabled)sync();}
  };
})();
