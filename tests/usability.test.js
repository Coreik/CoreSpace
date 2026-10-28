const { chromium } = require('playwright');
const PAGE='file://'+require('path').resolve(__dirname,'../index.html');
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const S=require('path').join(__dirname,'out')+'/';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(PAGE+'#shop'); await p.waitForTimeout(250);
  const h=await p.evaluate(()=>document.documentElement.scrollHeight); ok(h<20000,'shop height on phone '+h+'px (was ~44,000)');
  await p.evaluate(()=>scrollTo(0,3000)); await p.click('.crow [data-act=fcat][data-k=showers]'); await p.waitForTimeout(150);
  const top=await p.evaluate(()=>document.querySelector('#pgrid').getBoundingClientRect().top); ok(top>150&&top<330,'sticky Showers chip jumps to grid (top '+Math.round(top)+')');
  ok(await p.locator('.pcard').count()===await p.evaluate(()=>CATALOG.products.filter(x=>x.category==='showers').length),'showers only');
  await p.click('.crow [data-act=fcatall]'); await p.click('[data-act=fcat1][data-k=sanitary]'); ok(await p.locator('.pcard').count()===await p.evaluate(()=>CATALOG.products.filter(x=>x.category==='sanitary').length),'show all sanitaryware');
  const icons=await p.evaluate(()=>[...new Set(CATALOG.products.map(pIcon))].length); ok(icons>=13,'distinct icons: '+icons);
  // tap targets on key pages
  for (const r of ['home','shop','designs','look-filter-coffee','bathroom','my-bathrooms','book']){
    await p.evaluate(r=>location.hash=r,r); await p.waitForTimeout(150);
    const small=await p.evaluate(()=>[...document.querySelectorAll('#page button, #page a, #page select, #page input, header button, header a')].filter(e=>{const r=e.getBoundingClientRect(); if(!r.width) return false; const inText=e.tagName==='A'&&e.closest('p,li,.fine,.lede')&&!e.classList.contains('btn'); return !inText && (r.height<44 || r.width<44);}).map(e=>(e.className||e.tagName)+':'+(e.textContent||'').trim().slice(0,20)+':'+Math.round(e.getBoundingClientRect().height)));
    console.log(small.length?`  ${r} small: ${[...new Set(small)].slice(0,8).join(' | ')}`:`  ${r} all ≥44px`);
  }
  // FAB hides while typing
  await p.evaluate(()=>location.hash='book'); await p.waitForTimeout(150); await p.focus('#f-general-name');
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#wafab')).display)==='none','WhatsApp button hides while typing');
  await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#wafab')).display)!=='none','and comes back after');
  await p.evaluate(()=>location.hash='shop'); await p.waitForTimeout(200); await p.screenshot({path:S+'m-shop2.png'});
  await p.click('[data-act=menu]'); await p.waitForTimeout(300); await p.screenshot({path:S+'m-menu.png'});
  console.log('ERR',errs); await b.close();
})();
