const fs=require('fs');
const S=JSON.parse(fs.readFileSync(__dirname+'/out/shapes.json','utf8'));
const IDXS=process.argv.slice(2).map(Number);
const map=new Map(IDXS.map((k,i)=>[i,k]));
function inPoly(pt,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>pt[1])!==(b[1]>pt[1])&&pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function bbox(p){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const v of p){a=Math.min(a,v[0]);b=Math.min(b,v[1]);c=Math.max(c,v[0]);d=Math.max(d,v[1]);}return[a,b,c,d];}
const FONT={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','001','001','001'],'8':['111','101','111','101','111'],'9':['111','101','111','001','001']};
const COLS=7,CELL=124,GAP=5;
const ROWS=Math.ceil(IDXS.length/COLS),W=COLS*(CELL+GAP)+GAP,H=ROWS*(CELL+GAP)+GAP;
const buf=Buffer.alloc(W*H*3,255);
function px(x,y,r,g,b){if(x<0||y<0||x>=W||y>=H)return;const i=((H-1-y)*W+x)*3;buf[i]=b;buf[i+1]=g;buf[i+2]=r;}
IDXS.forEach((k,order)=>{
 const col=order%COLS,row=(order/COLS)|0,ox=GAP+col*(CELL+GAP),oy=GAP+row*(CELL+GAP);
 for(let x=0;x<CELL;x++){px(ox+x,oy,200,200,200);px(ox+x,oy+CELL-1,200,200,200);}
 for(let y=0;y<CELL;y++){px(ox,oy+y,200,200,200);px(ox+CELL-1,oy+y,200,200,200);}
 const poly=S[k].outline,bb=bbox(poly),w=bb[2]-bb[0],h=bb[3]-bb[1];
 const pad=22,sc=Math.min((CELL-pad*2)/w,(CELL-pad*2)/h);
 const offX=ox+(CELL-w*sc)/2,offY=oy+(CELL-h*sc)/2+8;
 for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++){const wx=bb[0]+(x-(offX-ox))/sc,wy=bb[1]+(y-(offY-oy))/sc;if(inPoly([wx,wy],poly))px(ox+x,oy+y,40,60,90);}
 const lb=String(k);
 for(let ci=0;ci<lb.length;ci++){const g=FONT[lb[ci]];for(let gy=0;gy<5;gy++)for(let gx=0;gx<3;gx++)if(g[gy][gx]==='1')for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++)px(ox+4+ci*8+gx*2+sx,oy+4+gy*2+sy,230,60,40);}
});
const hd=Buffer.alloc(54);hd.write('BM',0);hd.writeUInt32LE(54+buf.length,2);hd.writeUInt32LE(54,10);hd.writeUInt32LE(40,14);hd.writeInt32LE(W,18);hd.writeInt32LE(H,22);hd.writeUInt16LE(1,26);hd.writeUInt16LE(24,28);hd.writeUInt32LE(buf.length,34);hd.writeInt32LE(2835,38);hd.writeInt32LE(2835,42);
fs.writeFileSync(__dirname+'/out/pickS.bmp',Buffer.concat([hd,buf]));
console.log(`${W}×${H} 共 ${IDXS.length} 个`);
