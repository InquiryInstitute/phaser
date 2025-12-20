// Playwright test to check game loading and console output
import { test, expect } from '@playwright/test';

test('Game loads and displays correctly', async ({ page }) => {
  // Capture console messages
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text
    });
    console.log(`[${msg.type()}] ${text}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('Page error:', error.message);
  });
  
  // Navigate to the game
  const baseUrl = process.env.TEST_URL || 'https://phaser.inquiry.institute';
  console.log(`Testing URL: ${baseUrl}`);
  
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for Phaser to initialize
  await page.waitForTimeout(2000);
  
  // Check if Phaser game is loaded
  const phaserLoaded = await page.evaluate(() => {
    return typeof Phaser !== 'undefined';
  });
  expect(phaserLoaded).toBe(true);
  
  // Check if game canvas exists
  const canvas = await page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 5000 });
  
  // Try to interact with the game (press a key)
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  
  // Check console for specific messages
  const hasMapLoaded = consoleMessages.some(msg => 
    msg.text.includes('Map loaded') || msg.text.includes('Creating world scene')
  );
  
  const hasPlayerCreated = consoleMessages.some(msg => 
    msg.text.includes('Player created') || msg.text.includes('Creating player')
  );
  
  // Log summary
  console.log('\n=== Console Summary ===');
  console.log(`Total console messages: ${consoleMessages.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Map loaded: ${hasMapLoaded}`);
  console.log(`Player created: ${hasPlayerCreated}`);
  
  // Log all console messages
  console.log('\n=== All Console Messages ===');
  consoleMessages.forEach((msg, i) => {
    console.log(`${i + 1}. [${msg.type}] ${msg.text.substring(0, 200)}`);
  });
  
  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/game-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to test-results/game-screenshot.png');
  
  // Check for critical errors
  const criticalErrors = errors.filter(e => 
    !e.includes('favicon') && 
    !e.includes('AudioContext') &&
    !e.includes('setCollision')
  );
  
  if (criticalErrors.length > 0) {
    console.log('\n=== Critical Errors ===');
    criticalErrors.forEach(error => console.error(error));
  }
});
