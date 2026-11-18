'use strict';
// Original vector stickers drawn in code: bunny, cat, hedgehog, fox, bat and star.
window.StarAvatar=(()=>{
 const COLORS={rose:'#f2a0bd',blue:'#9bc7fc',mint:'#9ee7bd',gold:'#f7d27b',lavender:'#c7a8f4',peach:'#fac2a4'};
 const ACCESSORIES=['none','bow','crown','glasses','scarf'];
 const PETS=['bunny','cat','hedgehog','fox','bat','star'];
 const label={bunny:'Hase',cat:'Katze',hedgehog:'Igel',fox:'Fuchs',bat:'Fledermaus',star:'Stern'};
 const pick=(v,options,fallback)=>options.includes(v)?v:fallback;
 function source(options={}){
  const pet=pick(options.pet,PETS,'bunny'),color=COLORS[options.color]||COLORS.lavender,acc=pick(options.accessory,ACCESSORIES,'none');
  const ink='#352241';let ears='';
  if(pet==='bunny')ears=`<ellipse cx="29" cy="25" rx="12" ry="24" fill="${color}" stroke="${ink}" stroke-width="4" transform="rotate(-17 29 25)"/><ellipse cx="71" cy="25" rx="12" ry="24" fill="${color}" stroke="${ink}" stroke-width="4" transform="rotate(17 71 25)"/><ellipse cx="29" cy="25" rx="5" ry="14" fill="#f17ca8" transform="rotate(-17 29 25)"/><ellipse cx="71" cy="25" rx="5" ry="14" fill="#f17ca8" transform="rotate(17 71 25)"/>`;
  else if(pet==='cat'||pet==='fox')ears=`<path d="M15 47 L16 7 L45 30 M55 30 L84 7 L85 47" fill="${color}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M22 23 L25 36 L36 32 M64 32 L75 36 L78 23" fill="#f188ad"/>`;
  else if(pet==='hedgehog')ears=`<path d="M9 71 L5 42 L17 46 L13 21 L29 32 L34 6 L48 27 L63 8 L65 31 L87 18 L84 44 L96 48 L86 73 Z" fill="#84658b" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  else if(pet==='bat')ears=`<path d="M18 45L19 8L42 31M58 31L81 8L82 45" fill="${color}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M23 56 Q-3 20 1 61 L11 56 L17 68 L24 62 M77 62 L83 68 L89 56 L99 61 Q103 20 77 56" fill="#6f558d" stroke="${ink}" stroke-width="3"/>`;
  else ears='<path d="M50 3L60 26 86 23 74 45 92 63 65 65 50 90 36 66 9 62 26 45 15 23 40 25Z" fill="#f7dd78" stroke="'+ink+'" stroke-width="4"/>';
  const cheek=pet==='fox'?'#ffe7c5':'#f7a8c4';
  const accessory={
   none:'',
   bow:'<path d="M54 22Q72 0 74 22Q89 7 90 24Q80 42 70 29Q58 38 54 22Z" fill="#f55d9a" stroke="'+ink+'" stroke-width="3"/><circle cx="71" cy="23" r="6" fill="#fff0a4" stroke="'+ink+'" stroke-width="2"/>',
   crown:'<path d="M30 23L33 5L46 16L51 2L64 16L77 6L73 27Z" fill="#f8da70" stroke="'+ink+'" stroke-width="3"/><circle cx="51" cy="20" r="3" fill="#e88bb5"/>',
   glasses:'<circle cx="36" cy="54" r="11" fill="none" stroke="'+ink+'" stroke-width="4"/><circle cx="65" cy="54" r="11" fill="none" stroke="'+ink+'" stroke-width="4"/><path d="M47 53 L54 53" stroke="'+ink+'" stroke-width="4"/>',
   scarf:'<path d="M20 77Q48 90 81 74L80 87Q59 98 25 86Z" fill="#f1c568" stroke="'+ink+'" stroke-width="3"/><path d="M69 84L75 99L87 97L80 79" fill="#f1c568" stroke="'+ink+'" stroke-width="2"/>'
  }[acc];
  const whiskers=pet==='cat'||pet==='fox'?`<path d="M20 63 L6 57M20 67 L5 70 M80 63 L94 57M80 67 L95 70" fill="none" stroke="${ink}" stroke-width="2.3" stroke-linecap="round"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 105" role="img" aria-label="${label[pet]}">
   <ellipse cx="51" cy="100" rx="32" ry="4" fill="#1a0e2a" opacity=".2"/>
   ${ears}<ellipse cx="50" cy="59" rx="39" ry="37" fill="${color}" stroke="${ink}" stroke-width="4.5"/>
   <path d="M20 62 Q26 39 47 37" fill="none" stroke="#fff" opacity=".35" stroke-width="4" stroke-linecap="round"/>
   <ellipse cx="31" cy="69" rx="8" ry="5" fill="${cheek}" opacity=".85"/><ellipse cx="70" cy="69" rx="8" ry="5" fill="${cheek}" opacity=".85"/>
   <ellipse cx="37" cy="54" rx="4.5" ry="6.5" fill="${ink}"/><ellipse cx="64" cy="54" rx="4.5" ry="6.5" fill="${ink}"/>
   <circle cx="38" cy="51.5" r="1.8" fill="white"/><circle cx="65" cy="51.5" r="1.8" fill="white"/>
   <path d="M47 65 Q50 69 53 65 M50 68 L50 71 M44 75 Q50 80 56 75" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>
   ${whiskers}${accessory}</svg>`;
 }
 function html(options,cls=''){return `<span class="sticker-avatar ${cls}" aria-label="${label[options?.pet]||'Sternenwesen'}">${source(options)}</span>`;}
 const cache=new Map();
 function imageFor(options){
  const key=[options.pet,options.color,options.accessory].join(':');
  if(!cache.has(key)){
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source(options));cache.set(key,img);
  }
  return cache.get(key);
 }
 return {source,html,imageFor,COLORS,ACCESSORIES,PETS};
})();
