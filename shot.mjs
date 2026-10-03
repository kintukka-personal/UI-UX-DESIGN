import {chromium} from 'playwright';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:520,height:900}});
await p.goto('file://'+process.cwd()+'/proto-roll.html');
await p.evaluate(()=>{document.getAnimations();go();document.getAnimations().forEach(a=>a.pause())});
for(const t of [40,80,120]){await p.evaluate(t=>document.getAnimations().forEach(a=>a.currentTime=t),t);await p.screenshot({path:`proto-${t}.png`});}
await b.close();
