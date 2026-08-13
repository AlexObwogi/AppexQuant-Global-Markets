const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  
  // Click Log In
  await page.getByRole('button', { name: /Log In/i }).first().click();
  await page.waitForTimeout(1000);
  
  // Click Demo Sign In
  await page.getByRole('button', { name: /Demo Sign In/i }).click();
  
  // Wait for login to process
  await page.waitForTimeout(2000);
  
  // Check if we reached the dashboard
  const url = page.url();
  console.log('Final URL:', url);
  
  await browser.close();
})();
