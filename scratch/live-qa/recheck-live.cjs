const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const origin = 'https://foundersarena.exoasia.org';
  const results = {checkedAt:new Date().toISOString(),checks:[]};
  const record = (id,data) => { results.checks.push({id,...data}); console.log(JSON.stringify({id,...data})); };
  const anon = await browser.newContext();
  const publicPage = await anon.newPage();
  await publicPage.goto(origin+'/accept-nomination');
  await publicPage.waitForTimeout(1500);
  record('QA-05',{actor:'Public visitor',url:publicPage.url()});
  await anon.close();
  for (const account of JSON.parse(process.env.QA_ACCOUNTS)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin+'/sign-in');
    await page.locator('input[type=email]').fill(account.email);
    await page.locator('input[type=password]').fill(account.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard',{timeout:30000});
    await context.route('**/*', async route => {
      if(['POST','PUT','PATCH','DELETE'].includes(route.request().method())) await route.fulfill({status:409,contentType:'application/json',body:'{"error":"QA blocked production writes"}'});
      else await route.continue();
    });
    async function textAt(path){await page.goto(origin+path);await page.waitForTimeout(2500);return page.locator('body').innerText();}
    if(account.role==='admin'){
      const search = await context.request.get(origin+'/api/admin/users?search=Dev%2C&limit=1');
      record('QA-07',{actor:'Admin',status:search.status()});
      const list = await context.request.get(origin+'/api/admin/users?limit=100');
      const data = await list.json();
      const founder = (data.users||[]).find(u=>u.email==='founder@exoasia.com');
      record('QA-08',{actor:'Admin',credits:founder?.credits});
      const text = await textAt('/advisor/introductions');
      record('QA-11',{actor:'Admin',rawVersionedJson:text.includes('"_v":2')});
    }
    if(account.role==='founder'){
      const success = await textAt('/payments/success');
      record('QA-03',{actor:'Founder',falseSuccess:/Payment successful/i.test(success)});
      await textAt('/documents');
      record('QA-02',{actor:'Founder',fileInputs:await page.locator('input[type=file]').count()});
      const payments = await textAt('/payments');
      record('QA-06',{actor:'Founder',conflictingSweepCopy:payments.includes('applies on all tiers')&&payments.includes('Free for first run'),hasFreeFirstRun:payments.includes('Free for first run')});
      await textAt('/stage-4');
      const back=page.getByRole('button',{name:'Back to Stage 3',exact:true});
      if(await back.count()){await back.click();await page.waitForTimeout(750);}
      record('QA-04',{actor:'Founder',urlAfterBack:page.url()});
      const endpoint=await context.request.post(origin+'/api/auth/check-email',{data:{email:account.email}});
      let json;try{json=await endpoint.json();}catch{}
      record('QA-01',{actor:'Authenticated probe of public endpoint',status:endpoint.status(),existenceFlag:typeof json?.exists==='boolean'});
    }
    if(account.role==='ecosystem'){
      const text=await textAt('/matches');
      record('QA-10',{actor:'Ecosystem Partner',url:page.url(),emptyProjectMessage:/no.*projects/i.test(text)});
    }
    if(account.role==='investor'){
      const response=await context.request.get(origin+'/api/notifications');
      const data=await response.json();
      const notification=(data.notifications||[]).find(n=>/^\/api\/jobs\/.+\/acknowledge$/.test(n.href));
      const target=notification?await context.request.get(origin+notification.href):null;
      record('QA-09',{actor:'Investor',apiLinkPresent:!!notification,getStatus:target?.status()});
    }
    await context.close();
  }
  fs.writeFileSync('scratch/live-qa/checklist-results.json',JSON.stringify(results,null,2));
  await browser.close();
})().catch(error=>{console.error(error.message);process.exit(1)});
