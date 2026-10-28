const { chromium } = require('playwright');
const PAGE='file://'+require('path').resolve(__dirname,'../index.html');
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const S=require('path').join(__dirname,'out')+'/';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(PAGE+'#designs'); await p.waitForTimeout(200);
  ok(await p.locator('.lcard').count()===6,'6 look cards'); await p.screenshot({path:S+'d-designs.png'});
  await p.click('.lcard >> nth=0'); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>location.hash)==='#look-filter-coffee','look page route'); await p.screenshot({path:S+'d-look.png'});
  const t58=await p.locator('.summary .kv.tot').innerText();
  await p.selectOption('#looksize','6x10'); await p.waitForTimeout(150);
  const t610=await p.locator('.summary .kv.tot').innerText(); ok(t58!==t610,'size changes price '+t58.replace(/\n/g,' ')+' → '+t610.replace(/\n/g,' '));
  await p.locator('[data-act=lookmine]').first().click(); await p.click('.pickrow[data-b=new]'); await p.waitForTimeout(200);
  const st=await p.evaluate(()=>{const b=activeBath(); return {size:b.size, base:b.basePackageId, tiles:b.items.filter(i=>PBY[i.productId].unit==='sqft').map(i=>i.qty)};});
  ok(st.base==='filter-coffee'&&st.size==='6x10'&&st.tiles.length===3,'make it mine → new bathroom '+JSON.stringify(st));
  ok(/Filter Coffee look/.test(await p.locator('#bathpage').innerText()),'bathroom shows source look');
  const wa=decodeURIComponent(await p.locator('#bathsum a[href^="https://wa.me/"]').getAttribute('href'));
  ok(/Kajaria · Matte vitrified floor tile, anti-skid · CS-KAJ-FTL-01 \(Terracotta brown, matte\) × \d+ sq ft/.test(wa),'WhatsApp lists tiles with code, note, sq ft');
  // tile stepper steps 10
  const i=await p.evaluate(()=>activeBath().items.findIndex(x=>PBY[x.productId].unit==='sqft'));
  const q0=await p.evaluate(i=>activeBath().items[i].qty,i); await p.click(`#bathpage [data-act=bq][data-i="${i}"][data-d="1"]`); ok(await p.evaluate(i=>activeBath().items[i].qty,i)===q0+10,'tile qty steps by 10 sq ft');
  // shop tiles
  await p.evaluate(()=>location.hash='shop'); await p.waitForTimeout(200); await p.click('[data-act=fcat][data-k=tiles]');
  ok(await p.locator('.pcard').count()===8,'8 tiles in shop'); ok(/\/ sq ft/.test(await p.locator('.pcard .pr').first().innerText()),'tile price per sq ft');
  ok(await p.locator('[data-act=pkbrand]').count()===7,'package tabs still 7 fitting brands');
  console.log('ERR',errs); await b.close();
})();
