// Lightweight editor logic for nns ai studio (PRO - client side)
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const drawCanvas = document.getElementById('draw');
const dctx = drawCanvas.getContext('2d');

const fileInput = document.getElementById('fileInput');
const loadSample = document.getElementById('loadSample');
const clearAll = document.getElementById('clearAll');
const brightness = document.getElementById('brightness');
const contrast = document.getElementById('contrast');
const saturation = document.getElementById('saturation');
const blur = document.getElementById('blur');

let baseImage = null;
let overlays = [];
let selected = -1;

function fitCanvas(w,h){
  canvas.width = w; canvas.height = h;
  drawCanvas.width = w; drawCanvas.height = h;
}
fitCanvas(900,600);
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!baseImage){
    ctx.fillStyle='#f4fbff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#7aa6e6'; ctx.font='18px Inter, Arial'; ctx.fillText('Upload image or click Load Sample',20,40);
    renderOverlays();
    return;
  }
  const fit = fitToCanvas(baseImage.width, baseImage.height, canvas.width, canvas.height);
  const off = document.createElement('canvas'); off.width = fit.w; off.height = fit.h;
  const offctx = off.getContext('2d');
  offctx.drawImage(baseImage,0,0, baseImage.width, baseImage.height, 0,0, fit.w, fit.h);
  ctx.save();
  ctx.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturation.value}%) blur(${blur.value}px)`;
  ctx.drawImage(off, fit.x, fit.y);
  ctx.restore();
  renderOverlays();
}
function fitToCanvas(w,h,cw,ch){
  const ratio = Math.min(cw/w, ch/h);
  const nw = Math.round(w*ratio), nh = Math.round(h*ratio);
  return {x: Math.round((cw-nw)/2), y: Math.round((ch-nh)/2), w: nw, h: nh};
}
function renderOverlays(){
  overlays.forEach((o,i)=>{
    ctx.save();
    ctx.translate(o.x + o.w/2, o.y + o.h/2);
    ctx.rotate((o.r||0)*Math.PI/180);
    if(o.type==='sticker'){
      ctx.drawImage(o.img, -o.w/2, -o.h/2, o.w, o.h);
    } else if(o.type==='text'){
      ctx.font = `${o.size}px Inter, Arial`;
      ctx.fillStyle = o.color;
      if(o.outline){
        ctx.lineWidth = Math.max(2, Math.floor(o.size/12));
        ctx.strokeStyle = '#00000088';
        ctx.strokeText(o.text, -o.w/2 + 8, -o.h/2 + o.size);
      }
      ctx.fillText(o.text, -o.w/2 + 8, -o.h/2 + o.size);
    } else if(o.type==='frame'){
      ctx.strokeStyle = o.color || '#fff';
      ctx.lineWidth = o.width||30;
      ctx.strokeRect(-o.w/2, -o.h/2, o.w, o.h);
    }
    if(i===selected){
      ctx.lineWidth = 2; ctx.strokeStyle = '#1e88e5'; ctx.strokeRect(-o.w/2, -o.h/2, o.w, o.h);
    }
    ctx.restore();
  });
}

// upload image
fileInput.addEventListener('change',(e)=>{
  const f = e.target.files[0]; if(!f) return;
  const url = URL.createObjectURL(f);
  const I = new Image();
  I.onload = ()=>{ baseImage = I; const maxW=1200,maxH=900; const ratio=Math.min(maxW/I.width,maxH/I.height,1); fitCanvas(Math.round(I.width*ratio), Math.round(I.height*ratio)); render(); };
  I.src = url;
});
loadSample.addEventListener('click', ()=>{
  const I = new Image(); I.crossOrigin='anonymous'; I.onload = ()=>{ baseImage = I; fitCanvas(900,600); render(); }; I.src = 'https://picsum.photos/1200/800';
});
clearAll.addEventListener('click', ()=>{ baseImage=null; overlays=[]; selected=-1; ctx.clearRect(0,0,canvas.width,canvas.height); dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height); render(); updateOverlayList(); });

// filters
[brightness,contrast,saturation,blur].forEach(el=>el.addEventListener('input', render));
document.getElementById('hdr').addEventListener('click', ()=>{
  if(!baseImage) return; render(); const id=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ for(let c=0;c<3;c++){ let v=id.data[i+c]/255; v=Math.pow(v,0.9); id.data[i+c]=Math.min(255,Math.round(v*255)); } } ctx.putImageData(id,0,0);
});
document.getElementById('vintage').addEventListener('click', ()=>{ if(!baseImage) return; render(); const id=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ const r=id.data[i],g=id.data[i+1],b=id.data[i+2]; id.data[i]=Math.min(255,Math.round(r*0.9 + g*0.6 + b*0.2)); id.data[i+1]=Math.min(255,Math.round(r*0.2 + g*0.8 + b*0.1)); id.data[i+2]=Math.min(255,Math.round(b*0.9)); } ctx.putImageData(id,0,0); });
document.getElementById('bw').addEventListener('click', ()=>{ if(!baseImage) return; render(); const id=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ const v=0.3*id.data[i]+0.59*id.data[i+1]+0.11*id.data[i+2]; id.data[i]=id.data[i+1]=id.data[i+2]=v; } ctx.putImageData(id,0,0); });

// stickers
document.getElementById('stickers').addEventListener('click',(e)=>{
  const s = e.target.closest('.sticker'); if(!s) return; const emoji = s.dataset.emoji;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='220'>${emoji}</text></svg>`;
  const img = new Image(); const blob = new Blob([svg],{type:'image/svg+xml'}); const url = URL.createObjectURL(blob);
  img.onload = ()=>{ const o={type:'sticker',img:img,x:20,y:20,w:120,h:120,r:0}; overlays.push(o); selected = overlays.length-1; updateOverlayList(); render(); }; img.src=url;
});

// add text
document.getElementById('addText').addEventListener('click',()=>{
  const txt = document.getElementById('textInput').value.trim(); if(!txt) return;
  const o = {type:'text', text:txt, x:20, y:20, w:300, h:80, size: parseInt(document.getElementById('textSize').value), color: document.getElementById('textColor').value, outline: document.getElementById('textOutline').checked, r:0};
  overlays.push(o); selected = overlays.length-1; updateOverlayList(); render();
});

// overlay list UI
document.getElementById('overlayList') && (function(){})();
function updateOverlayList(){ const ul = document.getElementById('overlayList'); if(!ul) return; ul.innerHTML=''; overlays.forEach((o,i)=>{ const li = document.createElement('li'); li.textContent = (i+1)+': '+o.type+(o.text?(' - '+o.text):''); li.style.cursor='pointer'; li.addEventListener('click', ()=>{ selected=i; populateOverlayControls(); render(); }); ul.appendChild(li); }); }
function populateOverlayControls(){ if(selected<0) return; const o = overlays[selected]; document.getElementById('ox').value = Math.round(o.x); document.getElementById('oy').value = Math.round(o.y); document.getElementById('ow').value = Math.round(o.w); document.getElementById('oh').value = Math.round(o.h); document.getElementById('or').value = Math.round(o.r||0); }
['ox','oy','ow','oh','or'].forEach(id=>{ const el = document.getElementById(id); if(el) el.addEventListener('input', ()=>{ if(selected<0) return; const o = overlays[selected]; o.x = parseInt(document.getElementById('ox').value); o.y = parseInt(document.getElementById('oy').value); o.w = parseInt(document.getElementById('ow').value); o.h = parseInt(document.getElementById('oh').value); o.r = parseInt(document.getElementById('or').value); render(); }); });

// click to select overlay
canvas.addEventListener('click',(e)=>{ const p = getPointer(e,canvas); for(let i=overlays.length-1;i>=0;i--){ if(hitTest(overlays[i], p.x, p.y)){ selected = i; populateOverlayControls(); render(); return; } } selected = -1; updateOverlayList(); render(); });
function getPointer(e, cv){ const rect = cv.getBoundingClientRect(); const sx = cv.width/rect.width; const sy = cv.height/rect.height; return {x: Math.round((e.clientX-rect.left)*sx), y: Math.round((e.clientY-rect.top)*sy)}; }
function hitTest(o,x,y){ const cx = o.x + o.w/2, cy = o.y + o.h/2; const angle = (o.r||0)*Math.PI/180; const dx = x - cx, dy = y - cy; const rx = dx*Math.cos(-angle) - dy*Math.sin(-angle); const ry = dx*Math.sin(-angle) + dy*Math.cos(-angle); return rx >= -o.w/2 && rx <= o.w/2 && ry >= -o.h/2 && ry <= o.h/2; }

// drag overlay
let dragging=false,dragOff={x:0,y:0};
canvas.addEventListener('mousedown',(e)=>{ const p = getPointer(e,canvas); if(selected<0) return; if(hitTest(overlays[selected],p.x,p.y)){ dragging=true; dragOff.x = p.x - overlays[selected].x; dragOff.y = p.y - overlays[selected].y; }});
window.addEventListener('mousemove',(e)=>{ if(!dragging||selected<0) return; const p = getPointer(e,canvas); overlays[selected].x = p.x - dragOff.x; overlays[selected].y = p.y - dragOff.y; populateOverlayControls(); render(); });
window.addEventListener('mouseup',()=>{ dragging=false; });

// drawing
let drawing=false;
const drawModeBtn = document.getElementById('drawMode');
const eraseModeBtn = document.getElementById('eraseMode');
drawModeBtn && drawModeBtn.addEventListener('click', ()=>{ drawCanvas.style.pointerEvents='auto'; drawing=true; dctx.beginPath(); dctx.strokeStyle=document.getElementById('brushColor').value; dctx.lineWidth=document.getElementById('brushSize').value; });
eraseModeBtn && eraseModeBtn.addEventListener('click', ()=>{ drawCanvas.style.pointerEvents='auto'; drawing=true; dctx.globalCompositeOperation='destination-out'; dctx.lineWidth=document.getElementById('brushSize').value; });
drawCanvas.addEventListener('mousedown',(e)=>{ if(drawCanvas.style.pointerEvents!=='auto') return; drawing=true; dctx.beginPath(); const p=getPointer(e,drawCanvas); dctx.moveTo(p.x,p.y); });
drawCanvas.addEventListener('mousemove',(e)=>{ if(!drawing) return; const p=getPointer(e,drawCanvas); dctx.lineTo(p.x,p.y); dctx.stroke(); });
drawCanvas.addEventListener('mouseup',()=>{ drawing=false; dctx.globalCompositeOperation='source-over'; });
document.getElementById('clearDraw') && document.getElementById('clearDraw').addEventListener('click', ()=>{ dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height); drawCanvas.style.pointerEvents='none'; });

// simple remove bg heuristic
document.getElementById('removeBg') && document.getElementById('removeBg').addEventListener('click', ()=>{
  if(!baseImage) return alert('Upload image first');
  render();
  const id = ctx.getImageData(0,0,canvas.width,canvas.height);
  const w=canvas.width, h=canvas.height;
  let samples=[]; const pad=6;
  for(let x=0;x<w;x++){ for(let y=0;y<pad;y++){ const i=(y*w+x)*4; samples.push([id.data[i],id.data[i+1],id.data[i+2]]); } for(let y=h-pad;y<h;y++){ const i=(y*w+x)*4; samples.push([id.data[i],id.data[i+1],id.data[i+2]]); } }
  for(let y=0;y<h;y++){ for(let x=0;x<pad;x++){ const i=(y*w+x)*4; samples.push([id.data[i],id.data[i+1],id.data[i+2]]); } for(let x=w-pad;x<w;x++){ const i=(y*w+x)*4; samples.push([id.data[i],id.data[i+1],id.data[i+2]]); } }
  let br=0,bg=0,bb=0; samples.forEach(s=>{ br+=s[0]; bg+=s[1]; bb+=s[2]; }); br/=samples.length; bg/=samples.length; bb/=samples.length;
  for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const idx=(y*w+x)*4; const r=id.data[idx], g=id.data[idx+1], b=id.data[idx+2]; const dist=Math.sqrt((r-br)*(r-br)+(g-bg)*(g-bg)+(b-bb)*(b-bb)); const t=Math.max(0,Math.min(1,(dist-30)/120)); id.data[idx+3]=Math.round(255*t); } }
  const tmp = document.createElement('canvas'); tmp.width=canvas.width; tmp.height=canvas.height; tmp.getContext('2d').putImageData(id,0,0);
  const img = new Image(); img.onload=()=>{ const o={type:'sticker', img:img, x:0, y:0, w:canvas.width, h:canvas.height, r:0}; overlays.push(o); selected=overlays.length-1; updateOverlayList(); render(); }; img.src = tmp.toDataURL();
});

// replace bg color
document.getElementById('replaceBg') && document.getElementById('replaceBg').addEventListener('click', ()=>{
  const color = document.getElementById('bgColor').value;
  const o = {type:'frame', color: color, x:0, y:0, w:canvas.width, h:canvas.height, width:0};
  overlays.unshift(o); selected = 0; updateOverlayList(); render();
});

// download
document.getElementById('downloadBtn') && document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const final = document.createElement('canvas'); final.width = canvas.width; final.height = canvas.height; const fctx = final.getContext('2d');
  fctx.fillStyle = '#fff'; fctx.fillRect(0,0,final.width,final.height);
  fctx.drawImage(canvas,0,0);
  fctx.drawImage(drawCanvas,0,0);
  const fmt = document.getElementById('format') ? document.getElementById('format').value : 'png';
  if(fmt==='png'){ trigger(final.toDataURL('image/png'), 'nns_edit.png'); } else { const q = parseFloat(document.getElementById('jpgQuality') ? document.getElementById('jpgQuality').value : 0.92); trigger(final.toDataURL('image/jpeg', q), 'nns_edit.jpg'); }
});
function trigger(url,name){ const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }

// initial
updateOverlayList();
render();
