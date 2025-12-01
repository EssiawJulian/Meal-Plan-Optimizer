const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });

    const url = 'https://www.dining.vt.edu/MenuAtLocation.aspx?locationNum=15&naFlag=1';
    console.log(`Navigating to ${url}...`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Page loaded.');

        // Wait a bit for any dynamic content
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        fs.writeFileSync('d2_menu.html', html);
        console.log('HTML saved to d2_menu.html');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
