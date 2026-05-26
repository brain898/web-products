/* 君の名は - Cosmic background. Self-contained, ~static, zero deps. */
(function(){
  // Read palette tweak (from data attr or window var or default)
  var ROOT = document.documentElement;
  var PALETTE = (window.__KIMI_PALETTE__) || 'comet'; // twilight | comet | shrine

  var PALETTES = {
    // Deep night purple-blue (default — chosen vibe)
    twilight: {
      sky:   ['#0a0820','#1a1240','#2d1654','#43286a','#6a3680','#a85d8c','#e8a0a8'],
      stops: [0,    18,    34,    50,    66,    82,    100],
      nebula1:'rgba(140, 90, 200, 0.35)',
      nebula2:'rgba(80, 120, 220, 0.30)',
      city:  '#0c0a22',
      cityGlow:'rgba(255,170,140,0.20)',
      accent:'#ffb098',
      accent2:'#a890ff',
      thread:'#ff8a7a',
      text:'#f4eef9'
    },
    // Comet bias - more blue, brighter star tail
    comet: {
      sky:   ['#050818','#0d1638','#1b2a5c','#2c4380','#4a5fa0','#6f7fc0','#aab8e8'],
      stops: [0,    20,    38,    55,    72,    86,    100],
      nebula1:'rgba(80, 130, 240, 0.38)',
      nebula2:'rgba(170, 100, 220, 0.25)',
      city:  '#070b22',
      cityGlow:'rgba(180,200,255,0.22)',
      accent:'#9ec0ff',
      accent2:'#c890ff',
      thread:'#ff6e88',
      text:'#eef3ff'
    },
    // Shrine - warmer dusk
    shrine: {
      sky:   ['#1a0a18','#3a1338','#5a1f4a','#7a2e52','#a04a5a','#d07a64','#f0b878'],
      stops: [0,    20,    36,    52,    68,    84,    100],
      nebula1:'rgba(220, 100, 140, 0.32)',
      nebula2:'rgba(140, 70, 180, 0.30)',
      city:  '#15071a',
      cityGlow:'rgba(255,180,120,0.30)',
      accent:'#ffc090',
      accent2:'#ff90b8',
      thread:'#ffa06a',
      text:'#fbf0e8'
    }
  };

  var P = PALETTES[PALETTE] || PALETTES.twilight;

  // Inject CSS variables
  var sky = P.sky.map(function(c,i){return c+' '+P.stops[i]+'%';}).join(', ');
  ROOT.style.setProperty('--kimi-sky', sky);
  ROOT.style.setProperty('--kimi-nebula-1', P.nebula1);
  ROOT.style.setProperty('--kimi-nebula-2', P.nebula2);
  ROOT.style.setProperty('--kimi-city', P.city);
  ROOT.style.setProperty('--kimi-city-glow', P.cityGlow);
  ROOT.style.setProperty('--kimi-accent', P.accent);
  ROOT.style.setProperty('--kimi-accent-2', P.accent2);
  ROOT.style.setProperty('--kimi-thread', P.thread);
  ROOT.style.setProperty('--kimi-text', P.text);

  // Inject style block
  var css = ''
    + '.kimi-bg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:linear-gradient(180deg, var(--kimi-sky))}'
    + '.kimi-nebula{position:absolute;inset:-10% -10% 30% -10%;background:'
    + 'radial-gradient(ellipse 60% 50% at 22% 28%, var(--kimi-nebula-1), transparent 60%),'
    + 'radial-gradient(ellipse 50% 40% at 78% 18%, var(--kimi-nebula-2), transparent 65%),'
    + 'radial-gradient(ellipse 40% 30% at 50% 8%, rgba(255,200,180,0.18), transparent 70%);'
    + 'filter:blur(8px);will-change:transform;transition:transform 0.8s cubic-bezier(0.16,1,0.3,1)}'
    + '.kimi-stars{position:absolute;inset:0;will-change:transform;transition:transform 1.2s cubic-bezier(0.16,1,0.3,1)}'
    + '.kimi-stars svg{position:absolute;inset:0;width:100%;height:100%}'
    + '.kimi-star{animation:kimiTwinkle 4s ease-in-out infinite}'
    + '@keyframes kimiTwinkle{0%,100%{opacity:0.3}50%{opacity:1}}'
    + '.kimi-comet{position:absolute;top:-5%;left:-10%;width:160%;height:120%;will-change:transform;pointer-events:none}'
    + '.kimi-comet svg{width:100%;height:100%;overflow:visible}'
    + '.kimi-comet .ct{stroke:url(#kimi-comet-grad);stroke-linecap:round;fill:none;stroke-width:2;'
    + 'stroke-dasharray:1400;stroke-dashoffset:1400;animation:kimiComet 22s cubic-bezier(0.4,0,0.6,1) infinite;'
    + 'filter:drop-shadow(0 0 8px var(--kimi-accent)) drop-shadow(0 0 16px var(--kimi-accent-2))}'
    + '.kimi-comet .ch{fill:#fff;filter:drop-shadow(0 0 12px var(--kimi-accent)) drop-shadow(0 0 24px var(--kimi-accent-2));'
    + 'animation:kimiCometHead 22s cubic-bezier(0.4,0,0.6,1) infinite;opacity:0}'
    + '@keyframes kimiComet{0%,8%{stroke-dashoffset:1400;opacity:0}10%{opacity:1}45%,100%{stroke-dashoffset:0;opacity:0}}'
    + '@keyframes kimiCometHead{0%,8%{opacity:0;offset-distance:0%}10%{opacity:1}45%{opacity:0;offset-distance:100%}100%{opacity:0;offset-distance:100%}}'
    + '.kimi-city{position:absolute;left:0;right:0;bottom:0;height:32vh;will-change:transform;transition:transform 1s cubic-bezier(0.16,1,0.3,1)}'
    + '.kimi-city svg{display:block;width:100%;height:100%}'
    + '.kimi-city::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:120px;'
    + 'background:linear-gradient(180deg, transparent, var(--kimi-city-glow));pointer-events:none}'
    + '.kimi-grain{position:absolute;inset:0;opacity:0.06;mix-blend-mode:overlay;pointer-events:none;'
    + 'background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\'/></filter><rect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.5\'/></svg>")}'
    + '.kimi-vignette{position:absolute;inset:0;background:radial-gradient(ellipse 100% 70% at 50% 100%, rgba(0,0,0,0.55), transparent 70%);pointer-events:none}'
    + '@media (prefers-reduced-motion: reduce){.kimi-comet .ct,.kimi-comet .ch,.kimi-star{animation:none}}'
    ;
  var style = document.createElement('style');
  style.id = 'kimi-bg-css';
  style.textContent = css;
  document.head.appendChild(style);

  // Build the DOM
  function build(){
    if (document.querySelector('.kimi-bg')) return;
    var bg = document.createElement('div');
    bg.className = 'kimi-bg';
    bg.setAttribute('aria-hidden', 'true');

    // Nebula layer
    var neb = document.createElement('div');
    neb.className = 'kimi-nebula';
    bg.appendChild(neb);

    // Stars (deterministic so SSR-safe)
    var starsWrap = document.createElement('div');
    starsWrap.className = 'kimi-stars';
    var starSvg = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">';
    var seed = 73;
    function rnd(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    for (var i=0;i<140;i++){
      var x = (rnd()*1000).toFixed(1);
      var y = (rnd()*420).toFixed(1); // upper portion
      var r = (0.4 + rnd()*1.4).toFixed(2);
      var d = (rnd()*4).toFixed(2);
      var op = (0.4 + rnd()*0.6).toFixed(2);
      starSvg += '<circle class="kimi-star" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#fff" opacity="'+op+'" style="animation-delay:'+d+'s"/>';
    }
    // a few brighter ones with cross glow
    for (var j=0;j<8;j++){
      var bx = (rnd()*1000).toFixed(1);
      var by = (rnd()*300).toFixed(1);
      starSvg += '<g class="kimi-star" style="animation-delay:'+(rnd()*4).toFixed(2)+'s">'
        + '<circle cx="'+bx+'" cy="'+by+'" r="1.6" fill="#fff"/>'
        + '<circle cx="'+bx+'" cy="'+by+'" r="4" fill="#fff" opacity="0.25"/>'
        + '</g>';
    }
    starSvg += '</svg>';
    starsWrap.innerHTML = starSvg;
    bg.appendChild(starsWrap);

    // Comet layer
    var comet = document.createElement('div');
    comet.className = 'kimi-comet';
    comet.innerHTML = ''
      + '<svg viewBox="0 0 1600 900" preserveAspectRatio="none">'
      + '<defs>'
      + '<linearGradient id="kimi-comet-grad" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="#fff" stop-opacity="0"/>'
      + '<stop offset="60%" stop-color="var(--kimi-accent-2)" stop-opacity="0.7"/>'
      + '<stop offset="100%" stop-color="var(--kimi-accent)" stop-opacity="1"/>'
      + '</linearGradient>'
      + '</defs>'
      + '<path class="ct" d="M 100 80 Q 600 60 900 220 T 1500 460" />'
      + '<circle class="ch" r="3" fill="#fff" style="offset-path:path(\'M 100 80 Q 600 60 900 220 T 1500 460\')"/>'
      + '</svg>';
    bg.appendChild(comet);

    // City silhouette (hand-drawn skyline path)
    var city = document.createElement('div');
    city.className = 'kimi-city';
    city.innerHTML = ''
      + '<svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">'
      + '<defs>'
      + '<linearGradient id="kimi-city-grad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="var(--kimi-city)" stop-opacity="0.3"/>'
      + '<stop offset="40%" stop-color="var(--kimi-city)" stop-opacity="0.85"/>'
      + '<stop offset="100%" stop-color="var(--kimi-city)" stop-opacity="1"/>'
      + '</linearGradient>'
      + '</defs>'
      // Far layer — distant mountains/buildings
      + '<path fill="var(--kimi-city)" opacity="0.55" d="M0,400 L0,310 L40,300 L60,290 L90,295 L110,275 L150,280 L170,260 L210,265 L240,250 L280,255 L320,235 L360,240 L400,225 L450,230 L490,210 L540,215 L580,200 L640,205 L690,190 L740,195 L790,180 L850,185 L900,170 L960,175 L1010,165 L1070,170 L1120,155 L1180,160 L1240,145 L1300,150 L1360,140 L1430,145 L1490,135 L1560,140 L1600,135 L1600,400 Z"/>'
      // Near layer — taller skyline with windows
      + '<path fill="url(#kimi-city-grad)" d="M0,400 L0,330 L30,330 L30,290 L70,290 L70,310 L110,310 L110,250 L130,250 L130,230 L160,230 L160,260 L200,260 L200,210 L230,210 L230,180 L260,180 L260,225 L300,225 L300,270 L340,270 L340,200 L370,200 L370,175 L400,175 L400,150 L430,150 L430,195 L470,195 L470,240 L510,240 L510,170 L540,170 L540,140 L580,140 L580,120 L620,120 L620,180 L660,180 L660,220 L700,220 L700,160 L740,160 L740,130 L780,130 L780,100 L810,100 L810,70 L850,70 L850,110 L890,110 L890,150 L930,150 L930,200 L970,200 L970,160 L1010,160 L1010,120 L1050,120 L1050,180 L1090,180 L1090,140 L1130,140 L1130,210 L1170,210 L1170,170 L1210,170 L1210,230 L1250,230 L1250,190 L1290,190 L1290,260 L1330,260 L1330,210 L1380,210 L1380,180 L1420,180 L1420,240 L1470,240 L1470,290 L1520,290 L1520,260 L1560,260 L1560,300 L1600,300 L1600,400 Z"/>'
      // Window dots
      + windowDots()
      + '</svg>';

    function windowDots(){
      var s = '';
      var sd = 17;
      function r(){ sd=(sd*9301+49297)%233280; return sd/233280; }
      var positions = [
        [40,300],[55,310],[80,300],[120,260],[140,270],[170,240],[180,260],
        [220,220],[240,200],[270,235],[280,250],[315,240],[330,255],[350,210],
        [380,185],[410,160],[420,180],[450,170],[480,210],[490,225],[520,180],
        [560,150],[580,135],[600,160],[640,200],[670,185],[700,170],[720,150],
        [750,140],[780,115],[800,85],[830,95],[860,125],[895,140],[930,170],
        [960,175],[990,135],[1020,135],[1060,160],[1080,150],[1110,180],
        [1140,200],[1180,180],[1210,210],[1250,200],[1280,225],[1320,220],
        [1360,195],[1400,200],[1440,260],[1480,265],[1520,280],[1550,275]
      ];
      positions.forEach(function(p){
        if (r() < 0.55){
          var op = (0.4 + r()*0.5).toFixed(2);
          s += '<rect x="'+(p[0]+1)+'" y="'+(p[1]+5)+'" width="2" height="3" fill="var(--kimi-accent)" opacity="'+op+'"/>';
        }
      });
      return s;
    }

    bg.appendChild(city);

    var grain = document.createElement('div');
    grain.className = 'kimi-grain';
    bg.appendChild(grain);

    var vig = document.createElement('div');
    vig.className = 'kimi-vignette';
    bg.appendChild(vig);

    document.body.insertBefore(bg, document.body.firstChild);

    // Parallax — mouse + scroll
    var stars = starsWrap, neb2 = neb, cit = city;
    var mx = 0, my = 0, tx = 0, ty = 0;
    window.addEventListener('mousemove', function(e){
      var w = window.innerWidth, h = window.innerHeight;
      tx = (e.clientX / w - 0.5) * 2;
      ty = (e.clientY / h - 0.5) * 2;
    }, {passive:true});
    function loop(){
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      var sy = window.pageYOffset || 0;
      stars.style.transform = 'translate3d('+(mx*-12)+'px,'+(my*-8 - sy*0.05)+'px,0)';
      neb2.style.transform  = 'translate3d('+(mx*-20)+'px,'+(my*-14 - sy*0.08)+'px,0)';
      cit.style.transform   = 'translate3d('+(mx*-6)+'px,'+(sy*0.02)+'px,0)';
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
