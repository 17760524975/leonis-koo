/* 拍 G/H/K/Y 四关「补缝后」的完成态，外加 Q/N 对照（这两关本来就没缝） */
const path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const urlBase = 'file:///' + path.join(ROOT, 'tools', 'harness.html').replace(/\\/g, '/');
const udd = process.env.TEMP + '\\edgeshot_gap';
const SHOTS = [
  ['gap_H', 'level=26'], ['gap_G', 'level=25'], ['gap_K', 'level=29'], ['gap_Y', 'level=43'],
  ['gap_Q', 'level=35'], ['gap_N', 'level=32']
];
for (const [name, q] of SHOTS) {
  const f = path.join(OUT, name + '.png');
  spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
    '--user-data-dir=' + udd, '--window-size=750,1500', '--virtual-time-budget=4000',
    '--screenshot=' + f, urlBase + '?set=tangram7&screen=play&placed=7&' + q], { encoding: 'utf8', timeout: 90000 });
  console.log((require('fs').existsSync(f) ? 'OK ' : 'XX ') + name);
}
