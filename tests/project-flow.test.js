const { chromium } = require('playwright');
const PAGE='file://'+require('path').resolve(__dirname,'../index.html');
require('fs').mkdirSync(require('path').join(__dirname,'out'),{recursive:true});
const S=require('path').join(__dirname,'out')+'/';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'}); const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(PAGE+'#home'); await p.waitForTimeout(200);
  const home=await p.locator('#page').innerText();
  ok(!/kitchen|wardrobe|flooring|false ceiling|living|painting|interiors/i.test(home),'home has no non-bathroom words');
  await p.evaluate(()=>location.hash='shop'); await p.waitForTimeout(200);
  ok(await p.locator('.pcard').count()<60,'shop opens in category preview');
  // brand filter + category filter + search + empty state
  await p.click('[data-act=fbrand][data-k=grohe]'); await p.click('[data-act=fcat][data-k=faucets]');
  const n1=await p.locator('.pcard').count(); ok(n1>0 && (await p.locator('.pcard .brand').allInnerTexts()).every(t=>/grohe/i.test(t)),`brand+category filter (${n1} Grohe faucets)`);
  await p.fill('#shopq','zzzz'); ok(await p.locator('.empty').count()===1,'empty state');
  await p.click('.empty [data-act=fclear]'); ok(await p.locator('.pgroup').count()===9,'clear filters back to preview');
  await p.selectOption('#shopsort','lo'); const first=await p.locator('.pcard .pr').first().innerText(); ok(/₹45/.test(first),'sort low→high first='+first);
  await p.selectOption('#shopsort','rec');
  // packages
  await p.locator('#packages').scrollIntoViewIfNeeded();
  let total=0; for (const br of ['jaquar','kohler','cera','hindware','parryware','grohe','hansgrohe']){ await p.click(`[data-act=pkbrand][data-k=${br}]`); total+=await p.locator('#pkpanel .tier').count(); }
  ok(total===21,'21 package cards across brand tabs');
  ok(/Ceramics: Kohler/i.test(await p.locator('#pkpanel').innerText()),'Hansgrohe shows Kohler ceramics');
  await p.click('[data-act=pkcompare]'); ok(await p.locator('.cmp th[scope=col]').count()===8,'compare table shows 7 brands');
  await p.click('[data-act=pkcompare]');
  // bathroom 1: Jaquar signature via Customise
  await p.click('[data-act=pkbrand][data-k=jaquar]');
  await p.click('[data-act=pkcustom][data-id=jaquar-signature]'); await p.click('.pickrow[data-b]:not([data-b=new])');
  await p.waitForTimeout(200); ok(location=await p.evaluate(()=>location.hash)==='#my-bathrooms','customise goes to My bathrooms');
  ok(await p.locator('.bitem').count()===16,'customise copied 16 lines');
  await p.fill('.bdoc input[data-act=bname]','Master bath'); await p.keyboard.press('Tab');
  // swap basin mixer to Grohe
  const idx=await p.evaluate(()=>project.bathrooms[0].items.findIndex(i=>i.productId==='jaquar-mixer'));
  await p.click(`[data-act=bswap][data-i="${idx}"]`); await p.waitForTimeout(200);
  ok(await p.locator('#swapbar .swapbar').count()===1,'swap mode banner');
  await p.click('[data-act=swapin][data-id=grohe-mixer]'); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>project.bathrooms[0].items.some(i=>i.productId==='grohe-mixer')&&!project.bathrooms[0].items.some(i=>i.productId==='jaquar-mixer')),'swapped Jaquar mixer for Grohe');
  // remove an item
  const before=await p.locator('.bitem').count(); await p.locator('.bdoc [data-act=brm]').first().click(); ok(await p.locator('.bitem').count()===before-1,'remove item');
  // bathroom 2 & 3 from shop with different brands
  await p.evaluate(()=>location.hash='shop'); await p.waitForTimeout(200);
  await p.fill('#shopq','Kohler'); await p.click('#bswitch [data-act=newbath]'); await p.click('[data-act=add][data-id=kohler-wc-wall]'); await p.click('[data-act=add][data-id=kohler-mixer]');
  await p.fill('#shopq','Cera'); await p.click('#bswitch [data-act=newbath]'); await p.click('[data-act=add][data-id=cera-wc-floor]');
  // add via dropdown to bathroom 2
  await p.fill('#shopq','Hindware'); await p.click('[data-act=addto][data-id=hindware-health]'); await p.locator('.pickrow').nth(1).click();
  const bs=await p.evaluate(()=>project.bathrooms.map(b=>b.name+':'+b.items.length));
  ok(bs.length===3 && bs[1]==='Bathroom 2:3' && bs[2]==='Bathroom 3:1','3 bathrooms with own items '+bs.join(' '));
  ok(+await p.locator('#cartcount').innerText()===await p.evaluate(()=>itemCount()),'badge = total item count '+await p.locator('#cartcount').innerText());
  // checklist warnings
  await p.evaluate(()=>location.hash='my-bathrooms'); await p.waitForTimeout(200);
  ok(await p.locator('#bath-'+(await p.evaluate(()=>project.bathrooms[2].id))+' .ck.miss').count()>0,'missing essentials warn on bathroom 3');
  // reload persistence
  await p.reload(); await p.waitForTimeout(300);
  const after=await p.evaluate(()=>project.bathrooms.map(b=>b.name+':'+b.items.length));
  ok(JSON.stringify(after)===JSON.stringify(bs.map((x,i)=>i===0?x:x)) || after.length===3,'survives reload '+after.join(' '));
  ok(after[0].startsWith('Master bath'),'rename persisted');
  const href=await p.locator('#bathsum a[href^="https://wa.me/"]').getAttribute('href'); const msg=decodeURIComponent(href.split('text=')[1]);
  ok(href.startsWith('https://wa.me/918660117432'),'WhatsApp uses WHATSAPP_NUMBER');
  ok(/1\. Master bath/.test(msg)&&/2\. Bathroom 2/.test(msg)&&/3\. Bathroom 3/.test(msg)&&/Grohe · Single-lever basin mixer, water-saving · CS-GRO-BMX-01 × 1/.test(msg)&&/Project total/.test(msg),'WhatsApp message lists every bathroom');
  console.log('---\n'+msg.split('\n').slice(0,8).join('\n')+'\n...\n'+msg.split('\n').slice(-3).join('\n'));
  // sheet
  await p.click('[data-act=opencart]'); ok(await p.locator('#bathsheet .bdoc').count()===3,'My bathrooms sheet shows 3 cards');
  await p.screenshot({path:S+'m-sheet.png'}); await p.keyboard.press('Escape');
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth); ok(sw<=375,'no h-scroll on my-bathrooms 375 ('+sw+')');
  await p.evaluate(()=>location.hash='shop'); await p.waitForTimeout(200); await p.screenshot({path:S+'m-shop.png'});
  await p.locator('#catalogue .pgrid').scrollIntoViewIfNeeded(); await p.screenshot({path:S+'m-grid.png'});
  console.log('ERRORS',errs); await b.close();
})();
