const path=require('path');const {decodePNG,px}=require('./png.js');
const img=decodePNG(path.join(__dirname,'ref.png'));const W=img.w,H=img.h,N=W*H;
const fg=new Uint8Array(N);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const [r,g,b]=px(img,x,y);fg[y*W+x]=(r>238&&g>238&&b>238)?0:1;}
function cc(mask,minPx){const seen=new Uint8Array(N),out=[];
 for(let i=0;i<N;i++){if(seen[i]||!mask[i])continue;const st=[i];seen[i]=1;const pix=[];let x0=1e9,x1=-1,y0=1e9,y1=-1;
  while(st.length){const k=st.pop();pix.push(k);const x=k%W,y=(k/W)|0;
   if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   const nb=[k-1,k+1,k-W,k+W];for(let t=0;t<4;t++){if(t===0&&x===0)continue;if(t===1&&x===W-1)continue;
    const j=nb[t];if(j<0||j>=N||seen[j]||!mask[j])continue;seen[j]=1;st.push(j);}}
  if(pix.length>=minPx)out.push({pix,n:pix.length,x0,x1,y0,y1,cx:(x0+x1)/2,cy:(y0+y1)/2});}
 return out;}
const figs=cc(fg,2500).filter(o=>(o.x1-o.x0)<400&&(o.y1-o.y0)<400).sort((a,b)=>(Math.round(a.cy/110)-Math.round(b.cy/110))||(a.cx-b.cx));
const NAMES=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
figs.forEach((f,gi)=>{
  const cnt=new Map();
  for(const k of f.pix){const [r,g,b]=px(img,k%W,(k/W)|0);
    const q=(r>>4)+','+(g>>4)+','+(b>>4);cnt.set(q,(cnt.get(q)||0)+1);}
  const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1]).slice(0,9);
  console.log('--- '+NAMES[gi]+'  总'+f.n+'px');
  top.forEach(([k,v])=>{const [r,g,b]=k.split(',').map(n=>n*16+8);
    console.log('   #'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('')+'  '+String(v).padStart(5)+'  '+(v/f.n*100).toFixed(1)+'%');});
});
