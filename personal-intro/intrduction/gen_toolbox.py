"""Generate toolbox.html from brand logos + data.json with Apple dark theme."""
import json

# Read brand logos JS
with open('logos/brand_logos.js', 'r', encoding='utf-8') as f:
    logos_js = f.read().strip()

# Read data.json for inline fallback
with open('data.json', 'r', encoding='utf-8') as f:
    data_json = f.read().strip()

# Build the HTML
html = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Toolbox — Wenzhe</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=Noto+Sans+SC:wght@200;300;400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#1A1A1C;--bg-card:#222226;--border:#2D2D30;--border-hover:#404048;--text:#FAFAFA;--text-mute:#A0A0A8;--text-soft:#6A6A72;--accent:#FF7849;--tag-overseas:#4A9EFF;--tag-domestic:#34D399}
body{background:var(--bg);color:var(--text);font-family:'Inter','Noto Sans SC',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
.container{max-width:1240px;margin:0 auto;padding:0 40px;position:relative;z-index:2}
nav{padding:32px 0;display:flex;justify-content:space-between;align-items:center}
nav .logo{font-family:'Inter',sans-serif;font-size:20px;font-weight:600;letter-spacing:-0.03em;color:var(--text);text-decoration:none;transition:color 0.2s}
nav .logo:hover{color:var(--accent)}
nav .menu{display:flex;gap:40px;font-size:14px}
nav .menu a{color:var(--text-mute);text-decoration:none;transition:color 0.2s;font-weight:400}
nav .menu a:hover{color:var(--text)}
nav .menu a.active{color:var(--text)}
.page-header{padding:80px 0 40px;opacity:0;animation:fadeUp 0.6s ease forwards 0.1s}
.page-header .label{font-family:'Inter',sans-serif;font-size:13px;color:var(--text-soft);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;font-weight:500}
.page-header h1{font-family:'Inter',sans-serif;font-size:clamp(36px,5vw,64px);font-weight:200;letter-spacing:-0.04em;line-height:1.1;margin-bottom:12px}
.page-header h1 .strong{font-weight:600}
.page-header .subtitle{font-family:'Noto Sans SC',sans-serif;font-size:15px;color:var(--text-mute);font-weight:300;line-height:1.6}
.update-info{font-family:'Inter',sans-serif;font-size:12px;color:var(--text-soft);margin-top:16px;letter-spacing:0.02em}
.update-info span{color:var(--accent)}
.filter-bar{display:flex;gap:8px;margin-bottom:48px;opacity:0;animation:fadeUp 0.6s ease forwards 0.2s}
.filter-btn{font-family:'Inter',sans-serif;font-size:13px;padding:8px 20px;border-radius:100px;border:1px solid var(--border);background:transparent;color:var(--text-mute);cursor:pointer;transition:all 0.25s;font-weight:400;letter-spacing:0.02em}
.filter-btn:hover{border-color:var(--border-hover);color:var(--text)}
.filter-btn.active{background:var(--text);color:var(--bg);border-color:var(--text);font-weight:500}
.filter-btn .count{font-size:11px;opacity:0.6;margin-left:4px}
.category{margin-bottom:48px;opacity:0;animation:fadeUp 0.5s ease forwards}
.category:nth-child(1){animation-delay:0.3s}.category:nth-child(2){animation-delay:0.35s}.category:nth-child(3){animation-delay:0.4s}.category:nth-child(4){animation-delay:0.45s}.category:nth-child(5){animation-delay:0.5s}.category:nth-child(6){animation-delay:0.55s}.category:nth-child(7){animation-delay:0.6s}.category:nth-child(8){animation-delay:0.65s}
.category-header{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.category-icon-box{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);flex-shrink:0}
.category-icon-box svg{width:18px;height:18px;stroke:var(--text-mute);stroke-width:1.5;fill:none}
.category-name{font-family:'Inter','Noto Sans SC',sans-serif;font-size:18px;font-weight:500;letter-spacing:-0.01em}
.category-count{font-family:'Inter',sans-serif;font-size:12px;color:var(--text-soft);font-weight:400;letter-spacing:0.03em}
.category-line{flex:1;height:1px;background:var(--border)}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px}
.card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
.card:hover{border-color:var(--border-hover);transform:translateY(-1px);box-shadow:0 12px 32px -8px rgba(0,0,0,0.4)}
.card-scene{font-family:'Inter',sans-serif;font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-bottom:2px}
.card-scene-cn{font-family:'Noto Sans SC',sans-serif;font-size:12px;color:var(--text-soft);margin-bottom:14px;font-weight:300}
.card-note{font-family:'Noto Sans SC',sans-serif;font-size:12px;color:var(--text-soft);background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-weight:300;line-height:1.5}
.product-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-top:1px solid rgba(255,255,255,0.04)}
.product-row:first-of-type{border-top:none;padding-top:0}
.brand-logo{width:32px;height:32px;border-radius:8px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#2A2A2E}
.brand-logo img{width:100%;height:100%;object-fit:cover}
.brand-logo-fallback{font-family:'Inter',sans-serif;font-size:14px;font-weight:600}
.product-info{flex:1;min-width:0}
.product-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px}
.product-name{font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:var(--text);text-decoration:none}
.product-name:hover{color:var(--accent)}
.tag{font-family:'Inter',sans-serif;font-size:10px;padding:2px 8px;border-radius:100px;font-weight:500;letter-spacing:0.03em}
.tag-overseas{color:var(--tag-overseas);background:rgba(74,158,255,0.1)}
.tag-domestic{color:var(--tag-domestic);background:rgba(52,211,153,0.1)}
.product-highlight{font-family:'Noto Sans SC',sans-serif;font-size:12px;color:var(--text-soft);line-height:1.5;font-weight:300}
.product-link{display:inline-block;font-family:'Inter',sans-serif;font-size:11px;color:var(--accent);text-decoration:none;margin-top:4px;font-weight:500;transition:opacity 0.2s}
.product-link:hover{opacity:0.7}
.empty-state{display:none;text-align:center;padding:120px 0}
.empty-state p{font-family:'Inter',sans-serif;font-size:16px;color:var(--text-soft)}
footer{padding:48px 0;border-top:1px solid var(--border);font-family:'Inter',sans-serif;font-size:13px;color:var(--text-soft);display:flex;justify-content:space-between;font-weight:400}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:768px){.cards-grid{grid-template-columns:1fr}nav .menu{gap:24px;font-size:13px}.container{padding:0 24px}.page-header{padding:60px 0 24px}.filter-bar{flex-wrap:wrap}}
</style>
</head>
<body>
<div class="container">
  <nav>
    <a class="logo" href="index.html">wenzhe</a>
    <div class="menu">
      <a href="toolbox.html" class="active">AI 工具箱</a>
      <a href="course.html">课程拆解</a>
      <a href="works.html">作品集</a>
    </div>
  </nav>
  <section class="page-header">
    <div class="label">AI Toolbox</div>
    <h1>AI Toolbox<span class="strong">.</span></h1>
    <p class="subtitle">2026 最值得用的 AI 模型与工具。海外 + 国内分类筛选，每 3 天 AI 自动刷新。</p>
    <div class="update-info">Last updated: <span id="dateText">&mdash;</span> &middot; Auto-refreshed by AI every 3 days</div>
  </section>
  <div class="filter-bar">
    <button class="filter-btn active" data-filter="all">All <span class="count" id="countAll">0</span></button>
    <button class="filter-btn" data-filter="海外">Overseas <span class="count" id="countOverseas">0</span></button>
    <button class="filter-btn" data-filter="国内">Domestic <span class="count" id="countDomestic">0</span></button>
  </div>
  <div id="content"></div>
  <div class="empty-state" id="emptyState"><p>No items match this filter.</p></div>
  <footer><span>Built with Claude Code</span><span>2026</span></footer>
</div>
<script>
let data=null,currentFilter='all';
const catIcons={knowledge:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',content:'<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',code:'<svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',visual:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',multimedia:'<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',tools:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',agent:'<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',efficiency:'<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'};
''' + logos_js + r'''
function getBrand(name){const n=name.toLowerCase();if(n.includes('gpt')||n.includes('codex')||n.includes('chatgpt')||n.includes('openai'))return'openai';if(n.includes('claude')||n.includes('anthropic')||n.includes('opus'))return'anthropic';if(n.includes('gemini'))return'google';if(n.includes('deepseek'))return'deepseek';if(n.includes('豆包'))return'doubao';if(n.includes('glm')||n.includes('智谱'))return'zhipu';if(n.includes('kimi'))return'kimi';if(n.includes('moonshot'))return'moonshot';if(n.includes('suno'))return'suno';if(n.includes('minimax'))return'minimax';if(n.includes('tripo'))return'tripo';if(n.includes('可灵')||n.includes('kling'))return'kling';if(n.includes('seedance'))return'seedance';if(n.includes('即梦')||n.includes('seedream'))return'seedance';if(n.includes('飞书')||n.includes('lark'))return'lark';if(n.includes('aihot'))return'aihot';if(n.includes('getseed'))return'getseed';if(n.includes('perplexity'))return'perplexity';if(n.includes('genspark'))return'genspark';if(n.includes('grok'))return'grok';if(n.includes('notebooklm'))return'notebooklm';if(n.includes('coze'))return'coze';if(n.includes('沉浸式翻译')||n.includes('immersivetranslate'))return'immersivetranslate';if(n.includes('heygen'))return'heygen';if(n.includes('notion'))return'notion';if(n.includes('zapier'))return'zapier';if(n.includes('n8n'))return'n8n';if(n.includes('midjourney'))return'midjourney';if(n.includes('nano banana')||n.includes('nanobanana'))return'nanobanana';if(n.includes('canva'))return'canva';if(n.includes('gamma'))return'gamma';if(n.includes('hailuo'))return'hailuo';if(n.includes('cursor'))return'cursor';if(n.includes('lovable'))return'lovable';return null}
function buildLogo(name){const brand=getBrand(name);if(brand&&brandLogos[brand])return'<div class="brand-logo"><img src="'+brandLogos[brand]+'" alt="'+name+'" loading="lazy"></div>';const ch=name.replace(/[^a-zA-Z一-鿿-]/g,'').charAt(0)||'?';return'<div class="brand-logo brand-logo-fallback" style="background:#888;color:#fff">'+ch+'</div>'}
const sceneNames={'知识问答':{en:'Knowledge Q&A',cn:'知识问答'},'深度研究':{en:'Deep Research',cn:'深度研究'},'AI 资讯获取':{en:'AI News',cn:'AI 资讯获取'},'内容创作与知识管理':{en:'Content & Knowledge',cn:'内容创作与知识管理'},'数据分析':{en:'Data Analysis',cn:'数据分析'},'架构规划':{en:'Architecture',cn:'架构规划'},'代码开发执行':{en:'Code Execution',cn:'代码开发执行'},'前端设计':{en:'Frontend Design',cn:'前端设计'},'图片与平面设计':{en:'Image & Graphic',cn:'图片与平面设计'},'视频生成':{en:'Video Gen',cn:'视频生成'},'音乐生成':{en:'Music Gen',cn:'音乐生成'},'3D 生成':{en:'3D Generation',cn:'3D 生成'},'AI 输入法':{en:'AI Input',cn:'AI 输入法'},'AI 硬件':{en:'AI Hardware',cn:'AI 硬件'},'工作流自动化':{en:'Workflow Automation',cn:'工作流自动化'},'AI 工作空间':{en:'AI Workspace',cn:'AI 工作空间'},'AI Agent 构建':{en:'AI Agent Builder',cn:'AI Agent 构建'},'AI 演示文稿':{en:'AI Slides',cn:'AI 演示文稿'},'AI 设计平台':{en:'AI Design',cn:'AI 设计平台'},'AI 代码编辑器':{en:'AI Code Editor',cn:'AI 代码编辑器'},'AI 数字人':{en:'AI Avatar',cn:'AI 数字人'},'知识库管理':{en:'Knowledge Base',cn:'知识库管理'},'AI 翻译':{en:'AI Translation',cn:'AI 翻译'},'实时信息获取':{en:'Real-time Info',cn:'实时信息获取'},'AI 搜索引擎':{en:'AI Search Engine',cn:'AI 搜索引擎'}};
async function loadData(){try{const res=await fetch('./data.json');if(!res.ok)throw new Error('fetch failed');data=await res.json()}catch{if(window.__INLINE_DATA)data=window.__INLINE_DATA;else{document.getElementById('content').innerHTML='<div class="empty-state" style="display:block"><p>Data load failed.</p></div>';return}}document.getElementById('dateText').textContent=data.lastUpdated;render();updateCounts()}
function updateCounts(){if(!data)return;let t=0,o=0,d=0;data.categories.forEach(c=>c.scenarios.forEach(s=>s.products.forEach(p=>{t++;if(p.tag==='海外')o++;if(p.tag==='国内')d++})));document.getElementById('countAll').textContent=t;document.getElementById('countOverseas').textContent=o;document.getElementById('countDomestic').textContent=d}
function render(){if(!data)return;const content=document.getElementById('content'),empty=document.getElementById('emptyState');let html='',vc=0;data.categories.forEach(cat=>{const vs=cat.scenarios.filter(sc=>{if(currentFilter==='all')return true;return sc.products.some(p=>p.tag===currentFilter)});if(!vs.length)return;vc++;const icon=catIcons[cat.id]||catIcons.tools;html+='<section class="category"><div class="category-header"><div class="category-icon-box">'+icon+'</div><div><div class="category-name">'+cat.name+'</div><div class="category-count">'+vs.length+' scenario'+(vs.length>1?'s':'')+'</div></div><div class="category-line"></div></div><div class="cards-grid">';vs.forEach(sc=>{const fp=currentFilter==='all'?sc.products:sc.products.filter(p=>p.tag===currentFilter);if(!fp.length)return;const sn=sceneNames[sc.scene]||{en:sc.scene,cn:''};html+='<div class="card"><div class="card-scene">'+sn.en+'</div><div class="card-scene-cn">'+sn.cn+'</div>';if(sc.note)html+='<div class="card-note">'+sc.note+'</div>';fp.forEach(p=>{const tc=p.tag==='海外'?'tag-overseas':'tag-domestic';const nameHtml=p.url?'<a class="product-name" href="'+p.url+'" target="_blank" rel="noopener">'+p.name+'</a>':'<span class="product-name">'+p.name+'</span>';const linkHtml=p.url?'<a class="product-link" href="'+p.url+'" target="_blank" rel="noopener">Visit &rarr;</a>':'';html+='<div class="product-row">'+buildLogo(p.name)+'<div class="product-info"><div class="product-name-row">'+nameHtml+'<span class="tag '+tc+'">'+p.tag+'</span></div><div class="product-highlight">'+p.highlight+'</div>'+linkHtml+'</div></div>'});html+='</div>'});html+='</div></section>'});if(!vc){content.innerHTML='';empty.style.display='block'}else{content.innerHTML=html;empty.style.display='none'}}
document.querySelectorAll('.filter-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});btn.classList.add('active');btn.setAttribute('aria-selected','true');currentFilter=btn.dataset.filter;render()})});
window.__INLINE_DATA=''' + data_json + r''';
loadData();
</script>
</body>
</html>'''

with open('toolbox.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f'toolbox.html generated: {len(html)} bytes ({len(html)//1024} KB)')
