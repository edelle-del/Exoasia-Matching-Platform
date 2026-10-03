const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const accounts = JSON.parse(process.env.QA_ACCOUNTS);
  const results = [];
  fs.mkdirSync('scratch/live-qa/role-evidence', { recursive: true });
  for (const account of accounts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [], failures = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', async r => { if (r.status() >= 400 && /\/api\/|\/rest\/v1\//.test(r.url())) failures.push({ status: r.status(), url: r.url().replace(/\?.*/, ''), body: (await r.text().catch(() => '')).slice(0, 600) }); });
    await page.goto('https://foundersarena.exoasia.org/sign-in');
    await page.locator('input[type=email]').fill(account.email);
    await page.locator('input[type=password]').fill(account.password);
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(6500);
    const login = { role: account.role, path: 'LOGIN', url: page.url(), text: (await page.locator('body').innerText()).slice(0, 1300) };
    results.push(login); console.log(JSON.stringify(login));
    if (page.url().includes('/sign-in')) { await context.close(); continue; }
    await context.route('**/*', async route => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) {
        await route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"QA intercepted production write"}' });
      } else await route.continue();
    });
    const nav = await page.locator('a[href]').evaluateAll(es => es.map(e => e.getAttribute('href')).filter(h => h && h.startsWith('/') && !h.includes('?')));
    const paths = [...new Set([...nav, '/dashboard', '/matches', '/requests', '/data-room', '/community', '/events', '/payments', '/profile', '/announcements', '/feature-requests', ...(account.role === 'admin' ? ['/admin', '/admin/users', '/admin/credit-requests', '/admin/deal-boards', '/advisor/members', '/advisor/match-queue', '/advisor/introductions', '/advisor/manual-match', '/advisor/documents', '/advisor/network-graph'] : []), ...(account.role === 'ecosystem' ? ['/ecosystem'] : [])])].filter(p => p !== '/');
    for (const path of paths) {
      errors.length = 0; failures.length = 0;
      try {
        const response = await page.goto('https://foundersarena.exoasia.org' + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4500);
        if ((await page.locator('body').innerText()).includes('Loading')) await page.waitForTimeout(5000);
        const row = { role: account.role, path, url: page.url(), status: response?.status(), errors: [...errors], failures: [...failures], text: await page.locator('body').innerText(), buttons: await page.locator('button').allTextContents(), links: await page.locator('a[href]').evaluateAll(es => es.map(e => ({text:e.innerText,href:e.getAttribute('href')}))) };
        results.push(row);
        await page.screenshot({ path: 'scratch/live-qa/role-evidence/' + account.role + path.replace(/[^a-z0-9-]/gi, '_') + '.png', fullPage: true });
        console.log(JSON.stringify({role:account.role,path,url:row.url,status:row.status,errors:row.errors,failures:row.failures,text:row.text.slice(-1700)}));
      } catch (e) { results.push({role:account.role,path,error:e.message}); console.log(account.role + ' ' + path + ' ' + e.message); }
      fs.writeFileSync('scratch/live-qa/role-results.json', JSON.stringify(results, null, 2));
    }
    await page.setViewportSize({width:390,height:844});
    for (const path of ['/dashboard','/matches', ...(account.role==='ecosystem'?['/ecosystem']:account.role==='admin'?['/admin/users']:[])]) {
      await page.goto('https://foundersarena.exoasia.org'+path); await page.waitForTimeout(5000);
      const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
      console.log('MOBILE '+account.role+' '+path+' '+JSON.stringify(overflow));
      results.push({role:account.role,path,mobile:true,overflow});
      await page.screenshot({path:'scratch/live-qa/role-evidence/mobile-'+account.role+path.replace(/\//g,'_')+'.png',fullPage:true});
    }
    fs.writeFileSync('scratch/live-qa/role-results.json',JSON.stringify(results,null,2));
    await context.close();
  }
  await browser.close();
})().catch(e => {console.error(e.message); process.exit(1)});
