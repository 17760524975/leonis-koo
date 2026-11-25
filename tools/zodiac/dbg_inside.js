const fs=require('fs'),path=require('path');const L=require('./lib.js');const G=L.G;
const ex=JSON.parse(fs.readFileSync(path.join(__dirname,'zodiac_exact.json'),'utf8'));
const want=process.argv.slice(2);
ex.filter(lv=>!want.length||want.includes(lv.name)).forEach(lv=>{
  console.log('=== '+lv.name+' 轮廓'+lv.outline.length+'点 孔'+lv.holes.length);
  const polys=lv.pieces.map(p=>L.LOCAL[p.id].map(v=>{const r=L.rot(v,p.ang,p.f);return [r[0]*96+p.x,r[1]*96+p.y];}));
  polys.forEach((pp,i)=>{
    const ok=G.pieceInside(pp,lv.outline,lv.holes,3.0);
    if(ok) return;
    // 找板件顶点到轮廓的最小距离 / 在轮廓内的数量
    let outside=0,minD=Infinity;
    for(const v of pp){ if(!G.pointInPoly(v,lv.outline))outside++;
      for(let k=0;k<lv.outline.length;k++){const a=lv.outline[k],b=lv.outline[(k+1)%lv.outline.length];
        const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;let t=l2>0?((v[0]-a[0])*dx+(v[1]-a[1])*dy)/l2:0;
        t=Math.max(0,Math.min(1,t));minD=Math.min(minD,Math.hypot(v[0]-(a[0]+dx*t),v[1]-(a[1]+dy*t)));}}
    console.log('  '+lv.pieces[i].id+' 失败：顶点在外 '+outside+'/'+pp.length+' 顶点到轮廓最近 '+minD.toFixed(2));
  });
});
