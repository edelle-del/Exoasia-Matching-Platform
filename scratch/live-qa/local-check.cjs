const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const origin = 'http://localhost:3100';
  for (const account of JSON.parse(process.env.QA_ACCOUNTS)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(origin + '/sign-in');
    await page.locator('input[type=email]').fill(account.email);
    await page.locator('input[type=password]').fill(account.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await context.route('**/*', async route => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) {
        await route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"QA blocked database writes"}' });
      } else await route.continue();
    });
    if (account.role === 'admin') {
      for (const search of ['Dev', 'Dev,', 'Dev(', 'Dev"']) {
        const response = await context.request.get(origin + '/api/admin/users?limit=1&search=' + encodeURIComponent(search));
        assert.equal(response.status(), 200, 'admin search ' + search);
      }
      const response = await context.request.get(origin + '/api/admin/users?limit=100');
      const body = await response.json();
      const users = body.users || body.data || [];
      const founder = users.find(user => user.email === 'founder@exoasia.com');
      console.log('PASS admin punctuation searches; founder balance:', JSON.stringify(founder && { credits: founder.credits, credit_balance: founder.credit_balance }));
    } else {
      const response = await context.request.get(origin + '/api/admin/users?limit=1');
      assert.ok([401, 403].includes(response.status()), account.role + ' admin access');
    }
    if (account.role === 'ecosystem') {
      await page.goto(origin + '/matches');
      await page.waitForURL('**/ecosystem', { timeout: 20000 });
      console.log('PASS ecosystem matching redirects to portfolio discovery');
    }
    if (account.role === 'founder') {
      await page.goto(origin + '/documents');
      await page.waitForTimeout(2000);
      assert.ok(await page.locator('input[type=file]').count() > 0);
      await page.goto(origin + '/payments/success');
      await page.waitForTimeout(2000);
      await page.getByRole('heading', { name: 'Checkout not found', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: /Payment successful/i }).count(), 0);
      console.log('PASS founder file upload controls and no false payment success');
    }
    if (account.role === 'investor') {
      const response = await context.request.get(origin + '/api/notifications');
      assert.equal(response.status(), 200);
      const body = await response.json();
      const jobs = body.notifications.filter(n => n.acknowledgeHref);
      assert.ok(jobs.length > 0);
      assert.ok(jobs.every(n => n.href === '/matches' && n.acknowledgeHref.endsWith('/acknowledge')));
      console.log('PASS investor notifications use page links and separate acknowledgement endpoints');
    }
    console.log('PASS local login and role access: ' + account.role);
    await context.close();
  }
  await browser.close();
})().catch(error => { console.error(error.message); process.exit(1); });
