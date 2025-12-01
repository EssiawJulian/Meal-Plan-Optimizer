const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Stealth headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Example label URL from D2 menu (Crispy Rice Cereal)
    const url = 'https://foodpro.students.vt.edu/menus/label.aspx?locationNum=15&dtdate=11%2f30%2f2025&RecNumAndPort=300099*1';

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.content();
    fs.writeFileSync('label_page.html', html);
    console.log('Saved label_page.html');

    await browser.close();
})();
