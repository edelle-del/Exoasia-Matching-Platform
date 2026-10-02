const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('https://foundersarena.exoasia.org/sign-in',{waitUntil:'networkidle',timeout:60000});
 if(!process.env.QA_EMAIL){console.log(await page.locator('body').innerText());await browser.close();return;}
 await page.locator('input[type=email]').fill(process.env.QA_EMAIL);
 await page.locator('input[type=password]').fill(process.env.QA_PASSWORD);
 await page.locator('button[type=submit]').click();
 await page.waitForTimeout(8000);
 console.log('LOGIN '+page.url()+' '+(await page.locator('body').innerText()).slice(0,500));
 fs.mkdirSync('scratch/live-qa/evidence',{recursive:true});
 const results=[];
 const paths=['/dashboard','/projects','/matches','/community','/events','/deal-board','/documents','/data-room','/requests','/notifications','/announcements','/payments','/profile','/account-settings','/feature-requests','/docs','/stage-1','/stage-2','/stage-3','/stage-4','/ecosystem','/advisor/members','/advisor/match-queue','/advisor/introductions','/advisor/manual-match','/advisor/documents','/advisor/network-graph','/admin','/admin/users','/admin/credit-requests','/admin/deal-boards','/terms','/privacy'];
 for(const path of paths){
  const errors=[],failures=[];
  const onError=e=>errors.push(e.message);
  const onResponse=r=>{if(r.status()>=400)failures.push({status:r.status(),url:r.url().replace(/\?.*/, '')});};
  page.on('pageerror',onError);page.on('response',onResponse);
  let status=null,problem=null;
  try{const r=await page.goto('https://foundersarena.exoasia.org'+path,{waitUntil:'domcontentloaded',timeout:45000});status=r?.status();await page.waitForTimeout(2500);}catch(e){problem=e.message;}
  const text=await page.locator('body').innerText().catch(()=> '');
  const links=await page.locator('a[href]').evaluateAll(es=>es.map(e=>({text:e.innerText,href:e.getAttribute('href')}))).catch(()=>[]);
  const buttons=await page.locator('button').allTextContents().catch(()=>[]);
  const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth})).catch(()=>null);
  const row={path,url:page.url(),status,problem,errors,failures,text,links,buttons,overflow};results.push(row);
  await page.screenshot({path:'scratch/live-qa/evidence/'+path.replace(/\//g,'_')+'.png',fullPage:true}).catch(()=>{});
  page.off('pageerror',onError);page.off('response',onResponse);
  fs.writeFileSync('scratch/live-qa/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({path,url:row.url,status,errors,failures,text:text.slice(-1800),overflow}));
 }
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/dashboard','/projects','/community','/events','/payments','/profile','/docs','/sign-in']){
  await page.goto('https://foundersarena.exoasia.org'+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);
  const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
  await page.screenshot({path:'scratch/live-qa/evidence/mobile'+path.replace(/\//g,'_')+'.png',fullPage:true});
  console.log('MOBILE '+path+' '+JSON.stringify(overflow));
 }
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
