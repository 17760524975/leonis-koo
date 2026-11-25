const path=require('path');const {decodePNG,px}=require('./png.js');
const img=decodePNG(path.join(__dirname,'ref.png'));const W=img.w,H=img.h,N=W*H;
/* 统计精确颜色 */
const cnt=new Map();
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const [r,g,b]=px(img,x,y);
  if(r>238&&g>238&&b>238)continue;
  const k=(r>>3)+','+(g>>3)+','+(b>>3);
  cnt.set(k,(cnt.get(k)||0)+1);}
const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log('主色（5bit 量化）');
top.forEach(([k,v])=>{const [r,g,b]=k.split(',').map(n=>n*8+4);
  console.log('  #'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join(''), v, 'hue组');});
