const path=require('path');const fs=require('fs');
process.env.DBG='1';
const S=fs.readFileSync(path.join(__dirname,'solve_zodiac.js'),'utf8');
