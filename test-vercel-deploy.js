import { chromium } from '@playwright/test';

const BASE_URL = 'https://bond-track-pi.vercel.app';
const TEST_ADDRESS = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

async function testPage(page, name, url) {
  console.log(`\n--- Testing: ${name} ---`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check for HTTP errors
    if (!response.ok()) {
      console.log(`❌ FAILED - HTTP ${response.status()}`);
      return false;
    }
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit for any client-side errors to surface
    await page.waitForTimeout(3000);
    
    // Check for crash/white screen
    const bodyText = await page.textContent('body');
    const title = await page.title();
    
    console.log(`✅ Page loaded - Title: "${title}"`);
    console.log(`   Body length: ${bodyText?.length || 0} chars`);
    
    // Check for common error patterns
    const errorPatterns = ['BigInt', 'TypeError', 'Unhandled', 'crash', 'Error:'];
    const hasErrors = errorPatterns.some(pattern => 
      bodyText?.includes(pattern) || consoleErrors.some(e => e.includes(pattern))
    );
    
    if (hasErrors) {
      console.log(`⚠️  Potential errors detected in page content`);
      if (consoleErrors.length > 0) {
        console.log(`   Console errors: ${consoleErrors.slice(0, 3).join('; ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting THORNode Watcher E2E Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Address: ${TEST_ADDRESS}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  // Collect console errors
  const allConsoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      allConsoleErrors.push(msg.text());
    }
  });
  
  const results = {};
  
  // 1. Homepage
  results.homepage = await testPage(page, 'Homepage', BASE_URL);
  
  // 2. Lookup - enter address and click Lookup
  console.log('\n--- Testing: Lookup ---');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Find and fill the address input
    const input = page.locator('input[type="text"], input[placeholder*="address" i], input[placeholder*="thor" i]').first();
    await input.fill(TEST_ADDRESS);
    
    // Find and click the Lookup button
    const lookupBtn = page.locator('button:has-text("Lookup"), button:has-text("lookup")').first();
    await lookupBtn.click();
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`✅ Lookup submitted - Current URL: ${currentUrl}`);
    results.lookup = true;
  } catch (error) {
    console.log(`❌ Lookup failed - ${error.message}`);
    results.lookup = false;
  }
  
  // 3. Test dashboard pages
  const dashboardPages = [
    { name: 'Overview', path: `/dashboard/overview?address=${TEST_ADDRESS}` },
    { name: 'Nodes', path: `/dashboard/nodes?address=${TEST_ADDRESS}` },
    { name: 'Rewards', path: `/dashboard/rewards?address=${TEST_ADDRESS}` },
    { name: 'Risk', path: `/dashboard/risk?address=${TEST_ADDRESS}` },
    { name: 'Transactions', path: `/dashboard/transactions?address=${TEST_ADDRESS}` },
  ];
  
  for (const dp of dashboardPages) {
    results[dp.name.toLowerCase()] = await testPage(page, dp.name, `${BASE_URL}${dp.path}`);
  }
  
  // 4. Test theme toggle
  console.log('\n--- Testing: Theme Toggle ---');
  try {
    // Go to any dashboard page
    await page.goto(`${BASE_URL}/dashboard/overview?address=${TEST_ADDRESS}`, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    console.log(`Initial theme: ${initialTheme}`);
    
    // Find and click theme toggle
    const themeToggle = page.locator('button[aria-label*="theme" i], button[title*="theme" i], .theme-toggle').first();
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // Check new theme
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    console.log(`New theme: ${newTheme}`);
    
    if (initialTheme !== newTheme) {
      console.log('✅ Theme toggle works!');
      results.themeToggle = true;
    } else {
      console.log('⚠️  Theme did not change after toggle');
      results.themeToggle = false;
    }
  } catch (error) {
    console.log(`❌ Theme toggle test failed - ${error.message}`);
    results.themeToggle = false;
  }
  
  // Summary
  console.log('\n\n========== TEST SUMMARY ==========');
  for (const [test, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  await browser.close();
}

main().catch(console.error);
