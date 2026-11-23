const fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const ROOT=path.join(__dirname,'..');
const EDGE='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase='file:///'+path.join(ROOT,'tools','harness.html').replace(/\\/g,'/');
const W=430,H=Math.round(1624*430/750);
const udd=path.join(os.tmpdir(),'setbtn_'+process.pid);fs.mkdirSync(udd,{recursive:true});
for(const [name,q] of [
 ['setbtn_t4','screen=home&w='+W+'&set=tangram4'],
 ['setbtn_t7','screen=home&w='+W+'&set=tangram7']
]){
 const f=path.join(ROOT,'tools','out',name+'.png');try{fs.unlinkSync(f)}catch(e){}
 spawnSync(EDGE,['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--force-device-scale-factor=1','--user-data-dir='+udd,'--window-size='+W+','+H,'--virtual-time-budget=4200','--screenshot='+f,urlBase+'?'+q],{encoding:'utf8',timeout:60000});
 console.log(name,fs.existsSync(f)?'OK':'FAIL');
}
