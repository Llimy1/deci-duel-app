const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1242, height: 2688 }, deviceScaleFactor: 1 });
  const fileUrl = 'file://' + path.join(__dirname, 'source.html');
  await page.goto(fileUrl);
  await page.waitForTimeout(800); // allow web fonts to load

  const slides = ['slide1', 'slide2', 'slide3', 'slide4', 'slide5'];
  const names = [
    '01_home',
    '02_solo_measure',
    '03_realtime_duel',
    '04_leaderboard',
    '05_diary',
  ];

  for (let i = 0; i < slides.length; i++) {
    const el = await page.$('#' + slides[i]);
    await el.screenshot({ path: path.join(__dirname, `${names[i]}.jpg`), type: 'jpeg', quality: 95 });
    console.log('saved', names[i]);
  }

  await browser.close();
})();
