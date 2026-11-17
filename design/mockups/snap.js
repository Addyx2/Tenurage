const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const k of ['sky','studio','night']) {
    const url = 'file://' + __dirname + '/' + k + '.html';
    let p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    await p.screenshot({ path: `${k}-desktop.png`, fullPage: true });
    const c = await b.newContext({ ...devices['iPhone 14'] }); p = await c.newPage();
    await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    console.log(k, await p.evaluate(() => document.documentElement.scrollWidth));
    await p.screenshot({ path: `${k}-phone-1.png` });
    await p.evaluate(() => window.scrollTo(0, document.querySelector('.cols').offsetTop - 70)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${k}-phone-2.png` });
    await c.close();
  }
  await b.close();
})();
