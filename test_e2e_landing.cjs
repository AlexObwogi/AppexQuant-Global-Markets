const { chromium } = require('playwright');
(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Track errors and logs
  const errors = [];
  page.on('console', msg => {
     if (msg.type() === 'error') {
        errors.push(msg.text());
     }
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  
  // Wait for the specific headline from Scene 1 to ensure it mounted and rendered
  console.log('Waiting for headline...');
  try {
     await page.waitForSelector('text=SEE THE MARKET DIFFERENTLY', { timeout: 3000 });
     console.log('Headline rendered successfully.');
  } catch (e) {
     errors.push('Failed to render Scene 1 headline.');
  }
  
  // Wait a few seconds to verify the interval doesn't crash the page
  console.log('Waiting 8 seconds for scene transition test...');
  await page.waitForTimeout(8000);
  
  // Check if we can still click "Log In"
  console.log('Testing interactions...');
  try {
      await page.getByRole('button', { name: 'Log In' }).first().click();
      await page.waitForSelector('text=Welcome Back', { timeout: 2000 });
      console.log('Interaction (Log In) successful.');
  } catch (e) {
      errors.push('Failed to interact with Log In button or form did not appear.');
  }

  await browser.close();
  
  if (errors.length > 0) {
      console.error('TEST FAILED. Errors found:');
      console.error(errors);
      process.exit(1);
  } else {
      console.log('TEST PASSED. No white screen, no unhandled runtime crashes, interactions work.');
  }
})();
