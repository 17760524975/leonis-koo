const path=require('path');const {decodePNG,px}=require('./png.js');
const img=decodePNG(path.join(__dirname,'ref.png'));
const W=img.w;
function line(y,x0,x1){
  const a=[];for(let x=x0;x<=x1;x++){const [r,g,b]=px(img,x,y);const mx=Math.max(r,g,b);
    a.push(mx<150?'#':(mx<200?'+':'.'));}
  console.log('y='+y+' ',a.join(''));
}
for(const y of [95,100,105,110,115]) line(y,40,190);
console.log('--- 鼠 区域逐像素（y=110, x=60..110）');
for(let x=60;x<=110;x++){const [r,g,b]=px(img,x,110);console.log(x,r,g,b);}
