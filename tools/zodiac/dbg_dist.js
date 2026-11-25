const fs=require('fs'),path=require('path');const L=require('./lib.js');const G=L.G;
const ex=JSON.parse(fs.readFileSync(path.join(__dirname,'zodiac_exact.json'),'utf8'));
function segD(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;
  let t=l2>0?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(p[0]-(a[0]+dx*t),p[1]-(a[1]+dy*t));}
function pd(A,B){let m=Infinity;for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++){
  m=Math.min(m,segD(A[i],B[j],B[(j+1)%B.length]));m=Math.min(m,segD(B[j],A[i],A[(i+1)%A.length]));}return m;}
ex.slice(0,3).forEach(lv=>{
  const polys=lv.pieces.map(p=>L.LOCAL[p.id].map(v=>{const r=L.rot(v,p.ang,p.f);return [r[0]*96+p.x,r[1]*96+p.y];}));
  console.log('=== '+lv.name);
  for(let i=0;i<polys.length;i++){const row=[];
    for(let j=0;j<polys.length;j++){ if(i===j){row.push('   -   ');continue;}
      const d=pd(polys[i],polys[j]);const ov=G.convexOverlapArea(polys[i],polys[j]);
      row.push((ov>1?('ov'+ov.toFixed(0)):d.toFixed(1)).padStart(7)); }
    console.log('  '+lv.pieces[i].id.padEnd(3)+row.join(''));}
  console.log('  外接框', JSON.stringify(polys.map(p=>{const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);
    return [Math.min(...xs).toFixed(0),Math.min(...ys).toFixed(0),Math.max(...xs).toFixed(0),Math.max(...ys).toFixed(0)].join(',');})));
});
