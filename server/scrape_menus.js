const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const DINING_HALLS = [
    { id: 15, name: 'D2 at Dietrick Hall' },
    { id: 16, name: 'West End Market' },
    { id: 14, name: 'Turner Place' },
    { id: 9, name: 'Owens Food Court' },
    { id: 18, name: 'Squires Food Court' },
    { id: 71, name: 'DXpress' }
];

const BASE_URL = 'https://foodpro.students.vt.edu/menus/';

async function scrapeMenus() {
    console.log('Starting menu scraper...');

    // Database connection
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3307,
        user: 'user',
        password: 'password',
        database: 'db'
    });

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Stealth headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://dining.vt.edu/'
    });

    try {
        for (const hall of DINING_HALLS) {
            console.log(`\nScraping ${hall.name}...`);
            const menuUrl = `${BASE_URL}MenuAtLocation.aspx?locationNum=${hall.id}&naFlag=1`;

            await page.goto(menuUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Get all food links
            const foodLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('.recipe_title a').forEach(a => {
                    links.push({
                        name: a.innerText.trim(),
                        href: a.getAttribute('href')
                    });
                });
                return links;
            });

            console.log(`Found ${foodLinks.length} items at ${hall.name}. Processing...`);

            // Process each food item
            for (const item of foodLinks) {
                if (!item.href) continue;

                const labelUrl = BASE_URL + item.href;

                try {
                    await page.goto(labelUrl, { waitUntil: 'domcontentloaded' }); // lighter wait

                    const nutrition = await page.evaluate(() => {
                        const getText = (selector) => {
                            const el = document.querySelector(selector);
                            return el ? el.innerText.trim() : '';
                        };

                        const parseVal = (text) => {
                            const match = text.match(/(\d+(\.\d+)?)/);
                            return match ? parseFloat(match[0]) : 0;
                        };

                        // Extract text from containers
                        const caloriesText = getText('#calories_container');
                        const servingText = getText('#serving_size_container');

                        // For macros, the structure is <div class="col..."><span class="fact_label">Total Fat</span> 0.3g</div>
                        const getMacro = (className) => {
                            const el = document.querySelector(`.${className}`);
                            return el ? el.innerText.trim() : '';
                        };

                        return {
                            calories: parseVal(caloriesText.replace('Calories', '')),
                            fat: parseVal(getMacro('total_fat').replace('Total Fat', '')),
                            protein: parseVal(getMacro('protein').replace('Protein', '')),
                            carbs: parseVal(getMacro('total_carbohydrates').replace('Tot. Carb.', '')),
                            servingSize: servingText.replace('Serving Size', '').trim() || '1 serving'
                        };
                    });

                    // Insert into DB
                    // Check if exists first
                    const [existing] = await connection.execute(
                        'SELECT FoodID FROM FoodCatalogue WHERE FoodName = ? AND HallID = ?',
                        [item.name, hall.id]
                    );

                    if (existing.length === 0) {
                        await connection.execute(
                            `INSERT INTO FoodCatalogue (HallID, FoodName, Calories, Protein, Carbs, Fat, ServingSize)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [hall.id, item.name, nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat, nutrition.servingSize]
                        );
                        console.log(`  + Added: ${item.name}`);
                    } else {
                        // console.log(`  . Skipped (exists): ${item.name}`);
                    }

                    // Small delay to be nice
                    await new Promise(r => setTimeout(r, 200));

                } catch (err) {
                    console.error(`  ! Error scraping ${item.name}: ${err.message}`);
                }
            }
        }

    } catch (error) {
        console.error('Fatal Scraper Error:', error);
    } finally {
        await browser.close();
        await connection.end();
        console.log('Scraping complete.');
    }
}

scrapeMenus();
