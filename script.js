// NNS Editor - client-side features 1..9
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const drawCanvas = document.getElementById('draw');
const dctx = drawCanvas.getContext('2d');

let baseImage = null;
let currentWidth = 1000, currentHeight = 700;

// helpers
function fitCanvas(w,h){
  canvas.width = w; canvas.height = h;
  drawCanvas.width = w; drawCanvas.height = h;
  currentWidth = w; currentHeight = h;
}

// load image
fileInput && fileInput.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const url = URL.createObjectURL(f); const img = new Image();
  img.onload = ()=>{ baseImage = img; const maxW=1400, maxH=900; const ratio=Math.min(maxW/img.width, maxH/img.height, 1); fitCanvas(Math.round(img.width*ratio), Math.round(img.height*ratio)); ctx.drawImage(img,0,0,canvas.width,canvas.height); };
  img.src = url;
});

// 1) Remove BG heuristic (client-side)
document.getElementById('btnRemove') && document.getElementById('btnRemove').addEventListener('click', ()=>{
  if(!baseImage) return alert('Upload image first');
  const id = ctx.getImageData(0,0,canvas.width,canvas.height);
  const d = id.data; const w = canvas.width, h = canvas.height;
  let samples=[]; const pad=6;
  for(let x=0;x<w;x++){ for(let y=0;y<pad;y++){ const i=(y*w+x)*4; samples.push([d[i],d[i+1],d[i+2]]); } for(let y=h-pad;y<h;y++){ const i=(y*w+x)*4; samples.push([d[i],d[i+1],d[i+2]]); } }
  for(let y=0;y<h;y++){ for(let x=0;x<pad;x++){ const i=(y*w+x)*4; samples.push([d[i],d[i+1],d[i+2]]); } for(let x=w-pad;x<w;x++){ const i=(y*w+x)*4; samples.push([d[i],d[i+1],d[i+2]]); } }
  let br=0,bg=0,bb=0; samples.forEach(s=>{br+=s[0];bg+=s[1];bb+=s[2];}); br/=samples.length; bg/=samples.length; bb/=samples.length;
  for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const idx=(y*w+x)*4; const r=d[idx], g=d[idx+1], b=d[idx+2]; const dist=Math.sqrt((r-br)*(r-br)+(g-bg)*(g-bg)+(b-bb)*(b-bb)); const t=Math.max(0,Math.min(1,(dist-30)/120)); d[idx+3]=Math.round(255*t); } }
  // write to tmp canvas and use as overlay
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(id,0,0);
  const img = new Image(); img.onload = ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); alert('Background removed (heuristic).'); }; img.src = tmp.toDataURL();
});

// 2) Enhance (simple gamma/sharpen)
document.getElementById('btnEnhance') && document.getElementById('btnEnhance').addEventListener('click', ()=>{
  if(!baseImage) return alert('Upload image first');
  const id = ctx.getImageData(0,0,canvas.width,canvas.height); const d=id.data;
  // simple unsharp-like: boost midtones
  for(let i=0;i<d.length;i+=4){
    for(let c=0;c<3;c++){
      let v = d[i+c];
      v = Math.min(255, Math.round(Math.pow(v/255, 0.9)*255));
      d[i+c] = v;
    }
  }
  ctx.putImageData(id,0,0);
  alert('Enhance applied');
});

// 3) Filters: Cartoon, BW, HDR
document.getElementById('btnCartoon') && document.getElementById('btnCartoon').addEventListener('click', ()=>{
  if(!baseImage) return alert('Upload image first');
  const id = ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ id.data[i]=Math.floor(id.data[i]/32)*32; id.data[i+1]=Math.floor(id.data[i+1]/32)*32; id.data[i+2]=Math.floor(id.data[i+2]/32)*32; } ctx.putImageData(id,0,0); alert('Cartoon applied'); });
document.getElementById('btnBW') && document.getElementById('btnBW').addEventListener('click', ()=>{ if(!baseImage) return alert('Upload image first'); const id=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ const v = 0.3*id.data[i]+0.59*id.data[i+1]+0.11*id.data[i+2]; id.data[i]=id.data[i+1]=id.data[i+2]=v; } ctx.putImageData(id,0,0); alert('B&W applied'); });
document.getElementById('btnHDR') && document.getElementById('btnHDR').addEventListener('click', ()=>{ if(!baseImage) return alert('Upload image first'); const id=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<id.data.length;i+=4){ for(let c=0;c<3;c++){ let v=id.data[i+c]/255; v=Math.pow(v,0.9); id.data[i+c]=Math.min(255,Math.round(v*255)); } } ctx.putImageData(id,0,0); alert('HDR applied'); });

// 4) Text & Stickers
document.getElementById('addText') && document.getElementById('addText').addEventListener('click', ()=>{
  const t = document.getElementById('textInput').value.trim(); if(!t) return alert('Type text first');
  ctx.font = "48px Inter, Arial"; ctx.fillStyle = "#ffffff"; ctx.strokeStyle="#00000066"; ctx.lineWidth=4; ctx.strokeText(t,50,100); ctx.fillText(t,50,100);
});
document.getElementById('stickers') && document.getElementById('stickers').addEventListener('click', (e)=>{
  const s = e.target.closest('.sticker'); if(!s) return; const em = s.dataset.emoji; const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='220'>${em}</text></svg>`; const img = new Image(); const blob = new Blob([svg],{type:'image/svg+xml'}); const url = URL.createObjectURL(blob); img.onload=()=>{ ctx.drawImage(img,80,120,140,140); }; img.src=url;
});

// 5) Magic Brush (draw/erase)
let drawing=false, mode='draw';
const drawModeBtn = document.getElementById('drawMode'), eraseModeBtn = document.getElementById('eraseMode');
drawModeBtn && drawModeBtn.addEventListener('click', ()=>{ mode='draw'; drawCanvas.style.pointerEvents='auto'; dctx.globalCompositeOperation='source-over'; dctx.strokeStyle=document.getElementById('brushColor').value; dctx.lineWidth=document.getElementById('brushSize').value; });
eraseModeBtn && eraseModeBtn.addEventListener('click', ()=>{ mode='erase'; drawCanvas.style.pointerEvents='auto'; dctx.globalCompositeOperation='destination-out'; dctx.lineWidth=document.getElementById('brushSize').value; });
document.getElementById('clearDraw') && document.getElementById('clearDraw').addEventListener('click', ()=>{ dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height); drawCanvas.style.pointerEvents='none'; });

// draw events
drawCanvas.addEventListener('mousedown', e=>{ if(drawCanvas.style.pointerEvents!=='auto') return; drawing=true; const p = getPointer(e, drawCanvas); dctx.beginPath(); dctx.moveTo(p.x,p.y); });
drawCanvas.addEventListener('mousemove', e=>{ if(!drawing) return; const p = getPointer(e, drawCanvas); dctx.lineTo(p.x,p.y); dctx.stroke(); });
drawCanvas.addEventListener('mouseup', ()=>{ drawing=false; dctx.globalCompositeOperation='source-over'; });

// pointer helper
function getPointer(e, cv){ const r = cv.getBoundingClientRect(); const sx = cv.width / r.width; const sy = cv.height / r.height; return {x: Math.round((e.clientX - r.left) * sx), y: Math.round((e.clientY - r.top) * sy)}; }

// 6) Resize presets
document.getElementById('applyResize') && document.getElementById('applyResize').addEventListener('click', ()=>{
  const v = document.getElementById('preset').value;
  if(v==='custom') return alert('Choose a preset');
  const parts = v.split('x'); const w=parseInt(parts[0],10), h=parseInt(parts[1],10);
  const tmp = document.createElement('canvas'); tmp.width=w; tmp.height=h; tmp.getContext('2d').drawImage(canvas,0,0, w, h);
  fitCanvas(w,h); ctx.drawImage(tmp,0,0);
  alert('Resize applied');
});

// 7) Compression preview
document.getElementById('btnCompress') && document.getElementById('btnCompress').addEventListener('click', ()=>{
  const q = parseFloat(document.getElementById('quality').value);
  const url = canvas.toDataURL('image/jpeg', q);
  const win = window.open(); win.document.write('<img src="'+url+'">'); 
});

// 8) Auto color (simple stretch)
document.getElementById('autoColor') && document.getElementById('autoColor').addEventListener('click', ()=>{
  if(!baseImage) return alert('Upload image first');
  const id = ctx.getImageData(0,0,canvas.width,canvas.height); const d=id.data;
  let minR=255,minG=255,minB=255,maxR=0,maxG=0,maxB=0;
  for(let i=0;i<d.length;i+=4){ minR=Math.min(minR,d[i]); minG=Math.min(minG,d[i+1]); minB=Math.min(minB,d[i+2]); maxR=Math.max(maxR,d[i]); maxG=Math.max(maxG,d[i+1]); maxB=Math.max(maxB,d[i+2]); }
  const scaleR = 255/(maxR-minR||1), scaleG = 255/(maxG-minG||1), scaleB = 255/(maxB-minB||1);
  for(let i=0;i<d.length;i+=4){ d[i] = Math.min(255, Math.max(0, Math.round((d[i]-minR)*scaleR))); d[i+1] = Math.min(255, Math.max(0, Math.round((d[i+1]-minG)*scaleG))); d[i+2] = Math.min(255, Math.max(0, Math.round((d[i+2]-minB)*scaleB))); }
  ctx.putImageData(id,0,0); alert('Auto color correction applied');
});

// 9) Download / Export
document.getElementById('download') && document.getElementById('download').addEventListener('click', ()=>{
  const fmt = document.getElementById('format').value || 'png';
  const final = document.createElement('canvas'); final.width = canvas.width; final.height = canvas.height; const fctx = final.getContext('2d');
  fctx.fillStyle = '#fff'; fctx.fillRect(0,0,final.width,final.height);
  fctx.drawImage(canvas,0,0);
  fctx.drawImage(drawCanvas,0,0);
  if(fmt==='png'){ const url=final.toDataURL('image/png'); trigger(url,'nns_edit.png'); } else { const q = parseFloat(document.getElementById('quality') ? document.getElementById('quality').value : 0.92); const url=final.toDataURL('image/jpeg', q); trigger(url,'nns_edit.jpg'); }
});

function trigger(url,name){ const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); }

// keep draw canvas hidden by default
drawCanvas.style.pointerEvents='none';
