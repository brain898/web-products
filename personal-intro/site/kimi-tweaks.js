/* 君の名は · shared tweaks panel */
(function(){
  function buildPanel(){
    if(document.getElementById('kimi-tweaks'))return;
    var p=document.createElement('div');p.id='kimi-tweaks';
    p.style.cssText='position:fixed;right:20px;bottom:20px;z-index:1000;background:rgba(15,12,40,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,160,180,0.25);border-radius:16px;padding:20px 22px;font-family:Inter,sans-serif;font-size:12px;color:#f4eef9;min-width:240px;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:none';
    var current=window.__KIMI_PALETTE__||'twilight';
    function opt(v,label,grad,cur){var sel=v===cur;return '<button data-pal="'+v+'" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid '+(sel?'rgba(255,160,180,0.5)':'rgba(255,255,255,0.08)')+';background:'+(sel?'rgba(255,160,180,0.1)':'transparent')+';cursor:pointer;color:#f4eef9;font-family:inherit;font-size:12px;text-align:left;transition:all 0.2s"><span style="width:32px;height:20px;border-radius:5px;background:'+grad+';border:1px solid rgba(255,255,255,0.15);flex-shrink:0"></span><span>'+label+'</span></button>';}
    p.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:15px;color:#ffb098">Tweaks</span><button id="kimi-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:18px;line-height:1">×</button></div>'
      +'<div style="font-size:10px;letter-spacing:0.2em;color:rgba(220,210,240,0.5);text-transform:uppercase;margin-bottom:10px">Palette · 色调</div>'
      +'<div style="display:flex;flex-direction:column;gap:8px">'
      +opt('twilight','深夜紫蓝 Twilight','linear-gradient(135deg,#0a0820,#43286a,#a85d8c)',current)
      +opt('comet','彗星冷蓝 Comet','linear-gradient(135deg,#050818,#2c4380,#aab8e8)',current)
      +opt('shrine','黄昏暖橙 Shrine','linear-gradient(135deg,#3a1338,#a04a5a,#f0b878)',current)
      +'</div>';
    document.body.appendChild(p);
    p.addEventListener('click',function(e){var b=e.target.closest('[data-pal]');if(!b)return;var v=b.getAttribute('data-pal');try{window.parent.postMessage({type:'__edit_mode_set_keys',edits:{palette:v}},'*')}catch(_){}localStorage.setItem('kimiPalette',v);location.reload();});
    document.getElementById('kimi-close').onclick=function(){p.style.display='none';try{window.parent.postMessage({type:'__edit_mode_dismissed'},'*')}catch(_){}};
  }
  window.addEventListener('message',function(e){if(!e.data||!e.data.type)return;if(e.data.type==='__activate_edit_mode'){buildPanel();document.getElementById('kimi-tweaks').style.display='block'}if(e.data.type==='__deactivate_edit_mode'){var el=document.getElementById('kimi-tweaks');if(el)el.style.display='none'}});
  try{window.parent.postMessage({type:'__edit_mode_available'},'*')}catch(_){}
})();
