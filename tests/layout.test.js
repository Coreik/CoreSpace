const { chromium } = require('playwright');
const PAGE='file://'+require('path').resolve(__dirname,'../index.html');
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const S=require('path').join(__dirname,'out')+'/';
(async()=>{
  const b=await chromium.launch(); const errs=[];
  for (const [w,h] of [[1280,900],[1140,800],[375,812],[360,740]]){
    const p=await b.newPage({viewport:{width:w,height:h}});
    p.on('pageerror',e=>errs.push(`${w} ${e.message}`)); p.on('console',m=>{ if(m.type()==='error') errs.push(`${w} console ${m.text()}`); });
    await p.goto(PAGE+'');
    for (const r of ['home','designs','look-filter-coffee','look-kabini-stone','shop','my-bathrooms','bathroom','process','projects','about','book','terms','photo','account','kits','kitchen']){
      await p.evaluate(r=>{location.hash=r},r); await p.waitForTimeout(150);
      const sw=await p.evaluate(()=>document.documentElement.scrollWidth); const wide=await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(); return r.right>innerWidth+1 && getComputedStyle(e).position!=='fixed' && !e.closest('svg') && !e.closest('.tbl,.bswitch,.catrow,.chiprow.scroll')}).slice(0,3).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)));
      console.log((sw>w || wide.length)?'FAIL':'PASS',w,r,'scrollWidth',sw,wide.length?wide:'');
      if (w===1280) await p.screenshot({path:`${S}s-${w}-${r}.png`,fullPage:r!=='shop'});
    }
    console.log(w,'hash after kits:',await p.evaluate(()=>location.hash));
  }
  console.log('ERRORS',errs); await b.close();
})();
